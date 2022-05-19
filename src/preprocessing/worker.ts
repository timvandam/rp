import { writeFile, mkdir } from 'fs/promises'
import { createHash } from 'crypto'
import { Project, ScriptTarget } from 'ts-morph'
import * as path from 'path'
import { exploreFolder } from "../file-utils";
import {REPOS_FOLDER, PREPROCESSED_FOLDER} from "../config";
import { workerData } from 'worker_threads'
import { reportProgress, reportTotal } from '../threading'

async function preprocess(): Promise<void> {
	const folders = workerData as string[]
	reportTotal(folders.length)
	for (const folder of folders) {
		exploreFolder(folder, handleTSFile, (filePath: string) => filePath.endsWith('.ts'))
		reportProgress('increment')
	}
}

preprocess()

const sha256 = (str: string) => createHash('sha256').update(str).digest().toString('hex')

async function handleTSFile(code: string, filePath: string) {
	const dirPath = path.dirname(filePath)
	const relDirPath = path.relative(REPOS_FOLDER, dirPath)
	const outDirPath = path.resolve(PREPROCESSED_FOLDER, relDirPath)
	const fileName = path.basename(filePath, '.ts')

	const promises = []

	await mkdir(outDirPath, { recursive: true })
	for (const { name, code: tsCode } of getTSFunctionsAndMethods(code)) {
		const outFileName = `${fileName}.${name}.${sha256(tsCode).slice(0, 10)}.preprocessed`
		const outFilePath = path.resolve(outDirPath, outFileName)
		promises.push(writeFile(outFilePath, tsCode))
	}

	await Promise.all(promises)
}

export function getTSFunctionsAndMethods(code: string): { name: string, code: string }[] {
	const project = new Project({ compilerOptions: { target: ScriptTarget.ESNext }})
	const sourceFile = project.createSourceFile('temp.ts', code)

	return sourceFile.getFunctions().map(fn => {
		const code = fn.print().trim()
		const name = fn.getName() || 'anonymous_function'
		return { name, code }
	})
}
