import * as path from 'path';
import { ALLOWED_CPUS } from '../config';
import { multithread } from '../threading';
import { batchBySize, collect } from '../utils';
import { createWriteStream } from 'fs';
import { mkdir, opendir } from 'fs/promises';

export const REPOS_FOLDER = './data/Repos'
export const FUNCTIONS_FOLDER = './data/Functions'

async function startWorkers() {
  await mkdir(FUNCTIONS_FOLDER, { recursive: true });

  //TODO: Use files again
  const tsConfigs = await collect(findTsConfigs());

  console.log(`Found ${tsConfigs.length} projects. Adding types and extracting functions...`);

  await multithread(
    batchBySize(tsConfigs, 2),
    path.resolve(__dirname, './worker.js'),
    () => 0,
    0,
    ALLOWED_CPUS,
  );
}

if (require.main === module) {
  startWorkers();
}

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
