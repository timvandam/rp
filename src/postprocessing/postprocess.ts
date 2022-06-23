import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { zipAsync } from '../utils';
import { pathExists } from '../file-utils';
import tokenize from 'js-tokens';
import { countTypes } from '../type-explicitness/count-types';
import { removeComments } from '../masking/statement-masking';
import { opendir } from 'fs/promises';

const folder = process.argv[2];
const modelFolder = `${folder}/models`;
const setsFolder = `${folder}/sets`;

if (typeof folder !== 'string') {
  console.log('Invalid folder!');
  process.exit(1);
}

async function main() {
  console.log(`Starting postprocess. Folder = ${folder}`)

  if (!(await pathExists(modelFolder))) {
    console.log(`Folder missing: '${modelFolder}'. Did you train and test models yet?`)
    process.exit(1);
  }

  for await (const file of await opendir(modelFolder)) {
    if (file.isDirectory()) {
      await go(file.name);
    }
  }
}

async function go(model: string) {
  console.log('Post processing', model);

  const predictionsPath = path.resolve(modelFolder, model, 'predictions.txt');
  if (!(await pathExists(predictionsPath))) {
    console.log(`No predictions.txt for ${model}`);
    process.exit(1);
  }

  const testPath = path.resolve(setsFolder, model, 'test.json');
  if (!(await pathExists(predictionsPath))) {
    console.log('No test.json');
    return;
  }

  const outPath = path.resolve(modelFolder, model, 'postprocessed.txt');
  const postprocessed = createWriteStream(outPath, 'utf8');
  let predictions: AsyncIterable<string>;
  let inputs: AsyncIterable<string>;
  try {
    predictions = createInterface({
      input: createReadStream(predictionsPath, 'utf8'),
      crlfDelay: Infinity,
    });
    inputs = createInterface({
      input: createReadStream(testPath, 'utf8'),
      crlfDelay: Infinity,
    });
  } catch (e: unknown) {
    console.log('Cant read input/predictions');
    return;
  }

  for await (const [pred, json] of zipAsync(predictions, inputs)) {
    const obj = JSON.parse(json) as { input: string; gt: string };
    const gt = postprocess(obj.gt);
    const input = obj.input;
    const prediction = postprocess(pred);
    const { potential, annotations } = countTypes(obj.input);
    postprocessed.write(
      `${JSON.stringify({
        gt,
        prediction,
        input,
        inputTokens: [...tokenize(input)].map((token) => token.value),
        gtTokens: [...tokenize(gt)].map((token) => token.value),
        predictionTokens: [...tokenize(prediction)].map((token) => token.value),
        typeExplicitness: annotations / potential,
      })}\n`,
    );
  }

  console.log('Finished post processing', model);
}

function postprocess(code: string): string {
  if (code.includes('{')) code = code.slice(0, code.indexOf('{') + 1);
  if (code.includes('</s>')) code = code.slice(0, code.indexOf('</s>'));
  code = [...tokenize(code)].filter(token => {
    if (token.type === 'SingleLineComment') return false;
    if (token.type === 'MultiLineComment') return false;
    return true;
  }).map(token => {
    if (token.type === 'NumericLiteral') return '0';
    if (token.type === 'StringLiteral' || token.type === 'NoSubstitutionTemplate') return '""'
    if (token.type === 'WhiteSpace') return ' '
    return token.value;
  }).join('')
  code = code
    .replace(/['"`]<STR_LIT>['"`]/g, '""')
    .replace(/<NUM_LIT>/g, '0')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/, '\n');
  code = removeComments(code).trim();
  return code;
}

main();
