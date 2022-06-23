import path from 'path';
import {DATASET_SPLIT, RANDOM_SEED} from '../config';
import {collect, randChoiceWeighted} from '../utils';
import {createWriteStream} from 'fs';
import random from 'random-seed';
import {getTsFilesRecursively} from "./get-ts-files-recursively";

const folder = process.argv[2];
const dataset = process.argv[3];

if (typeof folder !== 'string') {
  console.log('Invalid folder!');
  process.exit(1);
}

if (typeof dataset !== 'string') {
  console.log('Invalid folder!');
  process.exit(1);
}

export async function splitData() {
    const functionsFolder = path.resolve(folder, 'functions', dataset);
    console.log(`Splitting data in folder '${functionsFolder}'`)

    const files = (await collect(getTsFilesRecursively(functionsFolder))).sort();

    const train = createWriteStream(path.resolve(functionsFolder, 'train.txt'), 'utf8');
    const test = createWriteStream(path.resolve(functionsFolder, 'test.txt'), 'utf8');
    const dev = createWriteStream(path.resolve(functionsFolder, 'dev.txt'), 'utf8');

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
        `Done. Created train.txt, test.txt and dev.txt in the ${functionsFolder} folder`,
    );
}

splitData();


