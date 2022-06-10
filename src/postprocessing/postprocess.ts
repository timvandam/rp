import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { RESULTS_FOLDER } from '../config';
import { createInterface } from 'readline';
import { zipAsync } from '../utils';
import jsTokens, { Token } from 'js-tokens';
import { pathExists } from '../file-utils';
import tokenize from 'js-tokens';
import { countTypes } from './count-types';

async function go(model: 'ts' | 'ts-extra' | 'js' | 'js-extra') {
  console.log('Post processing', model);

  if (!(await pathExists(RESULTS_FOLDER))) {
    console.log(`No results folder (${RESULTS_FOLDER})`);
    return;
  }

  const modelFolderPath = path.resolve(RESULTS_FOLDER, model);

  if (!(await pathExists(modelFolderPath))) {
    console.log(`No folder for ${model}`);
    return;
  }

  const predictionsPath = path.resolve(modelFolderPath, 'predictions.txt');
  if (!(await pathExists(predictionsPath))) {
    console.log(`No predictions.txt for ${model}`);
    return;
  }

  const testPath = path.resolve(modelFolderPath, `test_${model.split('-')[0]}.json`);
  if (!(await pathExists(predictionsPath))) {
    console.log(`No test_${model.split('-')[0]}.json`);
    return;
  }

  const outPath = path.resolve(modelFolderPath, 'postprocessed.txt');
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
    const prediction = postprocess(pred);
    const { potential, annotations } = countTypes(obj.input);
    postprocessed.write(
      `${JSON.stringify({
        gt,
        prediction,
        gtTokens: [...tokenize(gt)].map((token) => token.value),
        predictionTokens: [...tokenize(prediction)].map((token) => token.value),
        typeExplicitness: annotations / potential,
      })}\n`,
    );
  }

  console.log('Finished post processing', model);
}

async function main() {
  for (const model of ['js', 'js-extra', 'ts', 'ts-extra'] as const) {
    await go(model);
    console.log();
  }
}

function postprocess(code: string): string {
  return code
    .replace(/['"`]<STR_LIT>['"`]/g, '""')
    .replace(/<NUM_LIT>/g, '0')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/, '\n')
    .trim();
}

main();
