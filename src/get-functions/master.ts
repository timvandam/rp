import * as path from 'path';
import { ALLOWED_CPUS, FUNCTIONS_FOLDER, REPOS_FOLDER } from '../config';
import { findFilesRecursively, getFolderPaths } from '../file-utils';
import { multithread } from '../threading';
import { batchBySize, collect } from '../utils';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

async function startWorkers() {
  await mkdir(FUNCTIONS_FOLDER, { recursive: true });

  //  TODO: Limit to one per folder
  const tsConfigs = await collect(
    findFilesRecursively(REPOS_FOLDER, (filePath) => path.basename(filePath) === 'tsconfig.json'),
  );

  console.log(`Found ${tsConfigs.length} projects. Adding types and extracting functions...`);

  const writeStream = createWriteStream(path.resolve(FUNCTIONS_FOLDER, 'files.txt'), 'utf8');
  await multithread(
    batchBySize(tsConfigs, 2),
    path.resolve(__dirname, './worker.js'),
    (fileName: string) => {
      writeStream.write(`${fileName}\n`);
      return 0;
    },
    0,
    ALLOWED_CPUS,
  );

  // TODO: Ensure that files.txt is alphabetical/always in the same order. This is important for reproducibility.
  writeStream.end();
}

startWorkers();
