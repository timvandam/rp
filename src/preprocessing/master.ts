import cluster from 'cluster';
import * as path from 'path';
import { ALLOWED_CPUS, PREPROCESSED_FOLDER, REPOS_FOLDER } from '../config';
import { getFolderPaths } from '../file-utils';
import { multithread } from '../threading';
import { batchBySize } from '../utils';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

async function startWorkers() {
  const folders = await getFolderPaths(REPOS_FOLDER);
  await mkdir(PREPROCESSED_FOLDER, { recursive: true });
  const writeStream = createWriteStream(path.resolve(PREPROCESSED_FOLDER, 'files.txt'), {});
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
  writeStream.end();
}

startWorkers();
