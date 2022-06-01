import * as path from 'path';
import { ALLOWED_CPUS, MASKED_FOLDER, PREPROCESSED_FOLDER } from '../config';
import { multithread } from '../threading';
import { batchBySize } from '../utils';
import { mkdir, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';

async function startWorkers() {
  const files = await readFile(path.resolve(PREPROCESSED_FOLDER, 'files.txt'), 'utf8').then(
    (files) => files.split('\n').slice(0, -1),
  );
  await mkdir(MASKED_FOLDER, { recursive: true });
  const writeStream = createWriteStream(path.resolve(MASKED_FOLDER, 'files.txt'), {});
  await multithread(
    batchBySize(files, 512),
    path.resolve(__dirname, './worker.js'),
    (fileName: string) => {
      writeStream.write(`${fileName}\n`);
      return 0;
    },
    0,
    ALLOWED_CPUS,
  );
}

startWorkers();
