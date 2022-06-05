import { mkdir, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { Project, ScriptKind, ScriptTarget, SourceFile } from 'ts-morph';
import * as path from 'path';
import { FUNCTIONS_FOLDER, REPOS_FOLDER } from '../config';
import { workerData } from 'worker_threads';
import { reportProgress, reportResult, reportTotal } from '../threading';
import { addTypes } from '../add-types/add-types';

//TODO: If type, install all @types packages to improve type inference
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

  for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.getScriptKind() !== ScriptKind.TS) continue;
    await handleSourceFile(sourceFile);
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
