import { readFile } from 'fs/promises';
import path from 'path';
import { DATASET_SPLIT, FUNCTIONS_FOLDER, RANDOM_SEED } from '../config';
import { randChoiceWeighted } from '../utils';
import { createWriteStream } from 'fs';
import random from 'random-seed';

export async function splitData() {
  const filesPath = path.resolve(FUNCTIONS_FOLDER, 'files.txt');
  const filesTxt = await readFile(filesPath, 'utf8');
  const files = filesTxt.split('\n').slice(0, -1);

  const train = createWriteStream(path.resolve(FUNCTIONS_FOLDER, 'train.txt'), 'utf8');
  const test = createWriteStream(path.resolve(FUNCTIONS_FOLDER, 'test.txt'), 'utf8');
  const dev = createWriteStream(path.resolve(FUNCTIONS_FOLDER, 'dev.txt'), 'utf8');

  console.log(
    `Splitting ${files.length} files into train (${DATASET_SPLIT.TRAIN}), test (${DATASET_SPLIT.TEST}) and dev (${DATASET_SPLIT.DEV})`,
  );

  const prng = random.create(RANDOM_SEED);
  for (const file of files) {
    randChoiceWeighted(
      [train, test, dev],
      [DATASET_SPLIT.TRAIN, DATASET_SPLIT.TEST, DATASET_SPLIT.DEV],
      prng.random.bind(prng),
    ).write(`${file}\n`);
  }

  train.end();
  test.end();
  dev.end();

  console.log(
    `Done. Created train.txt, test.txt and validation.txt in the ${FUNCTIONS_FOLDER} folder`,
  );
}

splitData();
