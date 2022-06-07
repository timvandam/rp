import * as path from 'path';
import { ALLOWED_CPUS, FUNCTIONS_FOLDER, REPOS_FOLDER } from '../config';
import { multithread } from '../threading';
import { batchBySize, collect } from '../utils';
import { createWriteStream } from 'fs';
import { mkdir, opendir } from 'fs/promises';

async function startWorkers() {
  await mkdir(FUNCTIONS_FOLDER, { recursive: true });

  const tsConfigs = await collect(findTsConfigs());
  tsConfigs.splice(0, 522 * 2);

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

/**
 * Find tsconfig.json files. Only yields leaf tsconfig.json files.
 */
async function* findTsConfigs(
  folderPath: string = REPOS_FOLDER,
  foundTsConfigRef: { value: boolean } = { value: false },
): AsyncIterable<string> {
  const dir = await opendir(folderPath);

  const tsConfigFilePaths: string[] = [];
  const foundLowerTsConfig = { value: false };

  for await (const file of dir) {
    const filePath = path.resolve(dir.path, file.name);
    if (file.isFile() && file.name === 'tsconfig.json' && !foundLowerTsConfig.value) {
      tsConfigFilePaths.push(filePath);
    } else if (file.isDirectory()) {
      yield* findTsConfigs(path.resolve(dir.path, file.name), foundLowerTsConfig);
    }
  }

  if (foundLowerTsConfig.value) {
    foundTsConfigRef.value = true;
  } else {
    yield* tsConfigFilePaths;
  }
}
