import { mkdir, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { Project, ScriptKind, ScriptTarget, SourceFile } from 'ts-morph';
import * as path from 'path';
import { FUNCTIONS_FOLDER, REPOS_FOLDER } from '../config';
import { workerData } from 'worker_threads';
import { reportProgress, reportResult, reportTotal } from '../threading';
import { addTypes } from '../add-types/add-types';
import { batchBySize } from '../utils';

async function preprocess(): Promise<void> {
  const tsConfigs = workerData as string[];
  reportTotal(tsConfigs.length);
  for (const tsConfigFilePath of tsConfigs) {
    const project = new Project({ tsConfigFilePath });
    await handleProject(project);
    reportProgress('increment');
  }
}

preprocess();

async function handleProject(project: Project) {
  addTypes(project);

  const batches = batchBySize(
    project
      .getSourceFiles()
      .filter(
        (sourceFile) =>
          sourceFile.getScriptKind() === ScriptKind.TS &&
          !sourceFile.getDirectoryPath().includes('node_modules'),
      ),
    4,
  );

  for (const batch of batches) {
    await Promise.all(batch.map((sourceFile) => handleSourceFile(sourceFile)));
  }
}

function sha256(str: string) {
  return createHash('sha256').update(str).digest().toString('hex');
}

async function handleSourceFile(sourceFile: SourceFile) {
  const filePath = sourceFile.getFilePath();
  const dirPath = path.dirname(filePath);
  const relDirPath = path.relative(REPOS_FOLDER, dirPath);
  const outDirPath = path.resolve(FUNCTIONS_FOLDER, relDirPath);
  const fileName = path.basename(filePath, '.ts');

  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isImplementation()) continue;

    const code = fn.print();
    const name = fn.getName() || 'anonymous_function';
    const outFileName = `${fileName}.${name}.${sha256(code).slice(0, 10)}.ts`;
    const outFilePath = path.resolve(outDirPath, outFileName);
    await mkdir(outDirPath, { recursive: true });
    await writeFile(outFilePath, code);
    reportResult(path.relative(FUNCTIONS_FOLDER, outFilePath));
  }
}
