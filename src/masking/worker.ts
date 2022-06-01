import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { MASKED_FOLDER, PREPROCESSED_FOLDER } from '../config';
import { ScriptTarget, ts } from 'ts-morph';
import { workerData } from 'worker_threads';
import { reportProgress, reportResult, reportTotal } from '../threading';
import { addMaskComments, getMaskedVariants } from './statement-masking';
import { enumerate, zip } from '../utils';

// Look through all preprocessed functions, and emit masked functions
async function maskAllPreprocessed() {
  const files = workerData as string[];
  reportTotal(files.length);
  for (const file of files) {
    try {
      await createMaskedFiles(file);
    } catch (e: any) {
      // console.log(`An error occurred while masking ${file}: ${e.stack}`);
    }
    reportProgress('increment');
  }
}

maskAllPreprocessed();

async function createMaskedFiles(filePath: string): Promise<void> {
  filePath = path.resolve(PREPROCESSED_FOLDER, filePath);
  const code = await readFile(filePath, 'utf8');
  const dirPath = path.dirname(filePath);
  const relDirPath = path.relative(PREPROCESSED_FOLDER, dirPath);
  const outDirPath = path.resolve(MASKED_FOLDER, relDirPath);
  const fileName = path.basename(filePath, '.preprocessed');
  await mkdir(outDirPath, { recursive: true });

  const masked = getMaskedFunctions(code);
  for (const [i, obj] of enumerate(masked)) {
    const outFilePath = path.resolve(outDirPath, `${fileName}.${i}.masked.json`);
    await writeFile(outFilePath, JSON.stringify(obj));
    reportResult(path.relative(MASKED_FOLDER, outFilePath));
  }
}

/**
 * Gets masked versions of the code
 * @param code Input TS code (file from the Preprocessed folder)
 */
function getMaskedFunctions(code: string): {
  [lang in 'js' | 'ts']: {
    truth: string;
    input: string;
  };
}[] {
  let tsInstances: { input: string; truth: string }[] = [];
  let jsInstances: { input: string; truth: string }[] = [];

  // Transpilation can remove comments if they are in strange positions.
  // Hence, we try multiple times to find a masked version of the code that works.
  let tries = 0;
  do {
    const maskedTsCode = addMaskComments(code);
    const maskedJsCode = ts.transpile(maskedTsCode, {
      removeComments: false,
      target: ScriptTarget.ESNext,
    });

    tsInstances = getMaskedVariants(maskedTsCode);
    jsInstances = getMaskedVariants(maskedJsCode);
    tries++;
  } while (tries < 10 && tsInstances.length !== jsInstances.length);

  if (tsInstances.length !== jsInstances.length) {
    // console.log(
    //   `Mismatched number of masked variants (${tsInstances.length} vs ${jsInstances.length})`,
    // );
    return [];
  }

  return zip(tsInstances, jsInstances).map(([ts, js]) => ({ ts, js }));
}
