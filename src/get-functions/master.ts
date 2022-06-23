import * as path from 'path';
import { ALLOWED_CPUS } from '../config';
import { getFolderPaths } from '../file-utils';
import { multithread } from '../threading';
import { batchBySize } from '../utils';
import { mkdir } from 'fs/promises';

export const REPOS_FOLDER = './data/Repos'
export const FUNCTIONS_FOLDER = './data/Functions'

async function startWorkers() {
  const folders = await getFolderPaths(REPOS_FOLDER);
  await mkdir(FUNCTIONS_FOLDER, { recursive: true });
  await multithread(
    batchBySize(folders, 5),
    path.resolve(__dirname, './worker.js'),
    () => 0,
    0,
    ALLOWED_CPUS,
  );
}

if (require.main === module) {
  startWorkers();
}
