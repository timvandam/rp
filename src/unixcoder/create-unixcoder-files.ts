import { mkdir, readFile, rm } from 'fs/promises';
import { FUNCTIONS_FOLDER, UNIXCODER_FOLDER } from '../config';
import path from 'path';
import { createWriteStream } from 'fs';
import { preprocess } from '../preprocessing/preprocess';
import { addMaskComments, getMaskedVariants } from '../masking/statement-masking';
import { ScriptTarget, ts } from 'ts-morph';
import { concat, zip, zipOne } from '../utils';

async function createFiles() {
  await rm(UNIXCODER_FOLDER, { recursive: true, force: true });
  await mkdir(UNIXCODER_FOLDER, { recursive: true });
  await createTrainFiles();
  await createDevFiles();
  await createTestFiles();
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
}
