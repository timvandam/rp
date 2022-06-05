import { createReadStream } from 'fs';
import path from 'path';
import { FINETUNED_MODELS, UNIXCODER_FOLDER } from '../config';
import { createInterface } from 'readline';
import { zipAsync } from '../utils';
import { postprocess } from '../postprocessing/postprocess';
import jsTokens from 'js-tokens';
import * as rouge from './rouge/rouge';
import { distance } from 'fastest-levenshtein';
import { pathExists } from '../file-utils';

type Result = {
  n: number;
  rougeL: number;
  exactMatch: number;
  levenshtein: number;
};

async function evaluate(language: 'ts' | 'js') {
  const modelFolderPath = FINETUNED_MODELS[language === 'ts' ? 'TS' : 'JS'];

  if (!(await pathExists(modelFolderPath))) {
    console.log(`No folder for ${language}`);
    return;
  }

  const predictionsPath = path.resolve(modelFolderPath, 'predictions.txt');
  if (!(await pathExists(predictionsPath))) {
    console.log(`No predictions.txt for ${language}`);
    return;
  }

  const testPath = path.resolve(UNIXCODER_FOLDER, `test_${language}.json`);
  if (!(await pathExists(predictionsPath))) {
    console.log(`No test_${language}.json`);
    return;
  }

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

  let res: Result = {
    n: 0,
    levenshtein: 0,
    exactMatch: 0,
    rougeL: 0,
  };

  for await (const [prediction, json] of zipAsync(predictions, inputs)) {
    if (json.trim().length === 0 || prediction.trim().length === 0) continue;
    const obj = JSON.parse(json) as { input: string; gt: string };
    const gt = fixSpacing(postprocess(obj.gt.trim()));
    if (gt.trim().length === 0) continue;
    const pred = fixSpacing(postprocess(prediction.trim()));
    res = mergeResults(res, computeMetrics(gt, pred));
  }

  console.log(JSON.stringify(res, null, 2));
}

async function main() {
  console.log('Evaluating TS');
  await evaluate('ts');
  console.log('Evaluating JS');
  await evaluate('js');
}

main();

function fixSpacing(str: string) {
  return str.replace(/\s+/g, ' ');
}

const tokenizer = (str: string) => [...jsTokens(str)].map((token) => token.value);

const rougeL = (a: string, b: string) =>
  rouge.l(a, b, {
    tokenizer,
    segmenter: (str: string) => [str],
    beta: 1,
  });

const computeMetrics = (truth: string, prediction: string): Result => ({
  n: 1,
  rougeL: rougeL(truth, prediction).f,
  exactMatch: Number(truth === prediction),
  levenshtein: distance(truth, prediction) / Math.max(truth.length, prediction.length),
});

const mergeAverages = (avg1: number, n1: number, avg2: number, n2: number) =>
  (avg1 * n1 + avg2 * n2) / (n1 + n2);

const mergeResults = (res1: Result, res2: Result): Result => ({
  n: res1.n + res2.n,
  rougeL: mergeAverages(res1.rougeL, res1.n, res2.rougeL, res2.n),
  exactMatch: mergeAverages(res1.exactMatch, res1.n, res2.exactMatch, res2.n),
  levenshtein: mergeAverages(res1.levenshtein, res1.n, res2.levenshtein, res2.n),
});
