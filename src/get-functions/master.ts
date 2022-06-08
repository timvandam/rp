import * as path from 'path';
import { ALLOWED_CPUS, FUNCTIONS_FOLDER, REPOS_FOLDER } from '../config';
import { getFolderPaths } from '../file-utils';
import { multithread } from '../threading';
import { batchBySize } from '../utils';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

async function startWorkers() {
  const folders = await getFolderPaths(REPOS_FOLDER);
  await mkdir(FUNCTIONS_FOLDER, { recursive: true });
  const writeStream = createWriteStream(path.resolve(FUNCTIONS_FOLDER, 'files.txt'), 'utf8');
  await multithread(
    batchBySize(folders, 5),
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
