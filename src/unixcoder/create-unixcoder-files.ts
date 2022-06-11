import { mkdir, readFile, rm } from 'fs/promises';
import { FUNCTIONS_FOLDER, UNIXCODER_FOLDER } from '../config';
import path from 'path';
import { createWriteStream } from 'fs';
import { preprocess as _preprocess } from '../preprocessing/preprocess';
import { addMaskComments, getMaskedVariants } from '../masking/statement-masking';
import { ScriptTarget, ts } from 'ts-morph';
import { concat, zipOne } from '../utils';

export enum PreservedComments {
  NONE = 0b00,
  SINGLE_LINE = 0b01,
  MULTI_LINE = 0b10,
  ALL = 0b11,
}

type PreservedCommentsKey = 'NONE' | 'SINGLE_LINE' | 'MULTI_LINE' | 'ALL'

let PRESERVED_COMMENTS = PreservedComments.NONE;
if (process.argv[2].startsWith('--comments=')) {
  const values = process.argv[2].slice('--comments='.length).trim().split(',').map(v => v.trim().toUpperCase()).filter(v => v.length > 0)
  for (const value of values) {
    if (value in PreservedComments) {
      PRESERVED_COMMENTS |= PreservedComments[value as PreservedCommentsKey];
    } else {
      console.log(`Invalid option '${process.argv[2]}'`);
      process.exit(1);
    }
  }
} else {
  PRESERVED_COMMENTS = PreservedComments.ALL
}

const preprocess = (code: string) => _preprocess(code, PRESERVED_COMMENTS);

async function createFiles() {
  await rm(UNIXCODER_FOLDER, { recursive: true, force: true });
  await mkdir(UNIXCODER_FOLDER, { recursive: true });
  console.log(`Creating UniXcoder files. Preserve Comments = ${PreservedComments[PRESERVED_COMMENTS]}`);
  await Promise.all([createTrainFiles(), createDevFiles(), createTestFiles()]);
}

createFiles();

async function createTrainFiles() {
  console.log('Creating train_js.txt and train_ts.txt');

  const filesTxt = await readFile(path.resolve(FUNCTIONS_FOLDER, 'train.txt'), 'utf8');
  const files = filesTxt.split('\n').slice(0, -1);

  const writeStreamTs = createWriteStream(path.resolve(UNIXCODER_FOLDER, 'train_ts.txt'), 'utf8');
  const writeStreamJs = createWriteStream(path.resolve(UNIXCODER_FOLDER, 'train_js.txt'), 'utf8');
  for (const file of files) {
    const code = await readFile(path.resolve(FUNCTIONS_FOLDER, file), 'utf8');
    const jsCode = ts.transpile(code, {
      target: ScriptTarget.ESNext,
      removeComments: false,
    });

    writeStreamTs.write(`<s> ${preprocess(code)} </s>\n`);
    writeStreamJs.write(`<s> ${preprocess(jsCode)} </s>\n`);
  }

  writeStreamTs.end();
  writeStreamJs.end();

  console.log('Done creating train_js.txt and train_ts.txt');
}

function createTestFiles() {
  return createMaskedFiles('test');
}

function createDevFiles() {
  return createMaskedFiles('dev');
}

/**
 * Creates a file with masked instances.
 * Each line is a JSON Object with format { "input": string, "gt": string }
 */
async function createMaskedFiles(name: string) {
  console.log(`Creating ${name}_js.json and ${name}_ts.json`);

  const filesTxt = await readFile(path.resolve(FUNCTIONS_FOLDER, `${name}.txt`), 'utf8');
  const files = filesTxt.split('\n').slice(0, -1);

  const writeStreamTs = createWriteStream(
    path.resolve(UNIXCODER_FOLDER, `${name}_ts.json`),
    'utf8',
  );
  const writeStreamJs = createWriteStream(
    path.resolve(UNIXCODER_FOLDER, `${name}_js.json`),
    'utf8',
  );

  for (const file of files) {
    const code = await readFile(path.resolve(FUNCTIONS_FOLDER, file), 'utf8');

    try {
      const maskedCodeTs = addMaskComments(code);
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
        const obj = { input: `<s> ${preprocess(input)}`, gt: preprocess(gt) };
        writeStream.write(`${JSON.stringify(obj)}\n`);
      }
    } catch (e: unknown) {}
  }

  writeStreamTs.end();
  writeStreamJs.end();

  console.log(`Done creating ${name}_js.json and ${name}_ts.json`);
}
