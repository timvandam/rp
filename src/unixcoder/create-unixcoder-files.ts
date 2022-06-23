import { mkdir, readFile, rm } from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { preprocess } from '../preprocessing/preprocess';
import { addMaskComments, getMaskedVariants } from '../masking/statement-masking';
import { ScriptTarget, ts } from 'ts-morph';
import { concat, zipOne } from '../utils';

export enum PreservedComments {
  NONE = 0b00,
  SINGLE_LINE = 0b01,
  MULTI_LINE = 0b10,
  ALL = 0b11,
}

let DATA = 'normal'
let NAME = 'Unknown'
let FOLDER = './data';
let PREFIX = '<s> '
let SUFFIX = ' </s>'
let train = true;
let dev = true;
let test = true;
let replaceLiterals = true;
let preservedComments = [
    PreservedComments.ALL,
    PreservedComments.NONE,
    PreservedComments.SINGLE_LINE,
    PreservedComments.MULTI_LINE,
  ]

const strToBool = (str: string): boolean => ['1', 'true', 'y', 'yes'].includes(str.toLowerCase())

const argHandlers: Record<string, (value: string) => void> = {
  data: (value) => {
    DATA = value;
  },
  name: (value) => {
    NAME = value;
  },
  folder: (value) => {
    FOLDER = value.trim();
  },
  open: (value) => {
    PREFIX = value;
  },
  close: (value) => {
    SUFFIX = value;
  },
  train: (value) => {
    train = strToBool(value);
  },
  dev: (value) => {
    dev = strToBool(value);
  },
  test: (value) => {
    test = strToBool(value);
  },
  replaceLiterals: (value) => {
    replaceLiterals = strToBool(value);
  }
}

console.log(process.argv.slice(2))
for (const arg of process.argv.slice(2)) {
  const option = arg.match(/^--(.+)=(.*)/i)
  if (!option) continue;
  const handler = argHandlers[option[1]];
  if (!handler) {
    console.error(`Invalid key '${option[1]}'`)
    process.exit(1)
  }
  handler(option[2]);
}

async function createFiles() {
  await mkdir(path.resolve(FOLDER, 'sets'), { recursive: true });
  console.log(`Creating sets`);
  for (const comments of preservedComments) {
    const promises: Promise<void>[] = [];
    if (train) promises.push(createTrainFiles(comments));
    if (dev) promises.push(createDevFiles(comments));
    if (test) promises.push(createTestFiles(comments));
    await Promise.all(promises);
  }
}

createFiles();

const getFolderName = (lang: string, comments: PreservedComments) => `${NAME}-${DATA}-${lang}-${PreservedComments[comments].toString().toLowerCase()}`

async function createTrainFiles(comments: PreservedComments) {
  console.log(`Creating train files for ${NAME} ${DATA} ${PreservedComments[comments]}`);

  const filesTxt = await readFile(path.resolve(FOLDER, 'functions', DATA, 'train.txt'), 'utf8');
  const files = filesTxt.split('\n').slice(0, -1);

  const jsFolder = path.resolve(FOLDER, 'sets', getFolderName('js', comments));
  const tsFolder = path.resolve(FOLDER, 'sets', getFolderName('ts', comments));

  await mkdir(jsFolder, { recursive: true });
  await mkdir(tsFolder, { recursive: true });

  const writeStreamTs = createWriteStream(path.resolve(tsFolder, 'train.txt'), 'utf8');
  const writeStreamJs = createWriteStream(path.resolve(jsFolder, 'train.txt'), 'utf8');

  for (const file of files) {
    const code = await readFile(path.resolve(FOLDER, 'functions', DATA, file), 'utf8');
    const jsCode = ts.transpile(code, {
      target: ScriptTarget.ESNext,
      removeComments: false,
    });

    writeStreamTs.write(`${PREFIX}${preprocess(code, comments, replaceLiterals)}${SUFFIX}\n`);
    writeStreamJs.write(`${PREFIX}${preprocess(jsCode, comments, replaceLiterals)}${SUFFIX}\n`);
  }

  writeStreamTs.end();
  writeStreamJs.end();

  console.log(`Done creating train files for ${NAME} ${DATA} ${PreservedComments[comments]}`);
}

function createTestFiles(comments: PreservedComments) {
  return createMaskedFiles('test', comments);
}

function createDevFiles(comments: PreservedComments) {
  return createMaskedFiles('dev', comments);
}

/**
 * Creates a file with masked instances.
 * Each line is a JSON Object with format { "input": string, "gt": string }
 */
async function createMaskedFiles(name: string, comments: PreservedComments) {
  console.log(`Creating ${name} files for ${NAME} ${DATA} ${PreservedComments[comments]}`);

  const fileName = `${name}.json`;

  const filesTxt = await readFile(path.resolve(FOLDER, 'functions', DATA, `${name}.txt`), 'utf8');
  const files = filesTxt.split('\n').slice(0, -1);

  const jsFolder = path.resolve(FOLDER, 'sets', getFolderName('js', comments));
  const tsFolder = path.resolve(FOLDER, 'sets', getFolderName('ts', comments));

  await mkdir(jsFolder, { recursive: true });
  await mkdir(tsFolder, { recursive: true });

  const writeStreamTs = createWriteStream(path.resolve(tsFolder, fileName), 'utf8');
  const writeStreamJs = createWriteStream(path.resolve(jsFolder, fileName), 'utf8');

  for (const file of files) {
    const code = await readFile(path.resolve(FOLDER, 'functions', DATA, file), 'utf8');

    const maskedCodeTs = addMaskComments(code, file);
    const maskedVariantsTs = getMaskedVariants(maskedCodeTs);

    const maskedCodeJs = ts.transpile(maskedCodeTs, {
      target: ScriptTarget.ESNext,
      removeComments: false,
    });
    const maskedVariantsJs = getMaskedVariants(maskedCodeJs);

    if (maskedVariantsJs.length !== maskedVariantsTs.length) {
      continue;
    }

    for (const [writeStream, { gt, input }] of concat(
      zipOne(writeStreamTs, maskedVariantsTs),
      zipOne(writeStreamJs, maskedVariantsJs),
    )) {
      const obj = { input: `${PREFIX}${preprocess(input, comments, replaceLiterals)}`, gt: preprocess(gt, comments, replaceLiterals) };
      writeStream.write(`${JSON.stringify(obj)}\n`);
    }
  }

  writeStreamTs.end();
  writeStreamJs.end();

  console.log(`Done creating ${name} files for ${NAME} ${DATA} ${PreservedComments[comments]}`);
}
