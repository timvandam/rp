import { findFoldersAtDepth } from '../file-utils';
import { exec } from 'child_process';
import path from 'path';
import { collect, enumerate } from '../utils';

const folder = process.argv[2];

if (typeof folder !== 'string') {
  console.log('You must provide a folder to install dependencies in')
  process.exit(1);
}

async function installDependencies() {
  const repos = await collect(findFoldersAtDepth(folder, 2));
  for await (const [i, repoPath] of enumerate(repos)) {
    console.log(
      `${i + 1} / ${repos.length}\t| Installing dependencies for ${path
        .resolve(repoPath)
        .split(path.sep)
        .slice(-2)
        .join(path.sep)}`,
    );
    await yarn(repoPath);
  }
}

function yarn(path: string): Promise<void> {
  return new Promise((resolve) => exec('yarn', { cwd: path }, () => resolve()));
}

installDependencies();
