import { writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { Project, ScriptTarget } from 'ts-morph';
import * as path from 'path';
import { exploreFolder } from '../file-utils';
import { REPOS_FOLDER, FUNCTIONS_FOLDER } from './master';
import { workerData } from 'worker_threads';
import { reportProgress, reportTotal } from '../threading';

async function preprocess(): Promise<void> {
  const folders = workerData as string[];
  reportTotal(folders.length);
  for (const folder of folders) {
    await exploreFolder(
      folder,
      handleTSFile,
      (filePath: string) => filePath.endsWith('.ts') && !filePath.endsWith('.d.ts'),
    );
    reportProgress('increment');
  }
}

preprocess();

const sha256 = (str: string) => createHash('sha256').update(str).digest().toString('hex');

async function handleTSFile(code: string, filePath: string) {
  const dirPath = path.dirname(filePath);
  const relDirPath = path.relative(REPOS_FOLDER, dirPath);
  const outDirPath = path.resolve(FUNCTIONS_FOLDER, relDirPath);
  const fileName = path.basename(filePath, '.ts');

  await mkdir(outDirPath, { recursive: true });
  for (const { name, code: tsCode } of getFunctions(code)) {
    // const hash = sha256(tsCode);
    const outFileName = `${name}.ts`;
    const outFilePath = path.resolve(outDirPath, fileName, outFileName);
    await mkdir(path.resolve(outDirPath, fileName), { recursive: true })
    await writeFile(outFilePath, tsCode);
  }
}

export function getFunctions(code: string): { name: string; code: string }[] {
  const project = new Project({ compilerOptions: { target: ScriptTarget.ESNext } });
  const sourceFile = project.createSourceFile('temp.ts', code);

  return sourceFile
    .getFunctions()
    .filter((fn) => fn.isImplementation())
    .map((fn) => {
      const code = fn.print().trim();
      const name = fn.getName() || 'anonymous_function';
      return { name, code };
    });
}
