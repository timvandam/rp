import { readFile, writeFile, opendir, mkdir } from 'fs/promises'
import { createHash } from 'crypto'
import { Project, ScriptTarget } from 'ts-morph'
import * as path from 'path'
import { exploreFolder } from "../file-utils";
import {REPOS_FOLDER, PREPROCESSED_FOLDER} from "../config";

export function preprocess(folderPath: string): Promise<void> {
	return exploreFolder(folderPath, handleTSFile, (filePath: string) => filePath.endsWith('.ts'))
}

const sha256 = (str: string) => createHash('sha256').update(str).digest().toString('hex')

async function handleTSFile(code: string, filePath: string) {
	const dirPath = path.dirname(filePath)
	const relDirPath = path.relative(REPOS_FOLDER, dirPath)
	const outDirPath = path.resolve(PREPROCESSED_FOLDER, relDirPath)
	const fileName = path.basename(filePath, '.ts')

	const promises = []

	await mkdir(outDirPath, { recursive: true })
	for (const { name, code: tsCode } of await getTSFunctionsAndMethods(code)) {
		const outFileName = `${fileName}.${name}.${sha256(tsCode).slice(0, 10)}.preprocessed`
		const outFilePath = path.resolve(outDirPath, outFileName)
		promises.push(writeFile(outFilePath, tsCode))
	}

	await Promise.all(promises)
}

export async function getTSFunctionsAndMethods(code: string): Promise<{ name: string, code: string }[]> {
	const project = new Project({ compilerOptions: { target: ScriptTarget.ESNext }})
	const sourceFile = project.createSourceFile('temp.ts', code)

	// add all methods as functions so they are also considered
	for (const method of sourceFile.getClasses().flatMap(clazz => clazz.getMethods())) {
		sourceFile.addFunction({
			isAsync: method.isAsync(),
			name: method.getName(),
			isGenerator: method.isGenerator(),
			parameters: method.getParameters().map(param => param.getStructure()),
			typeParameters: method.getTypeParameters().map(param => param.getStructure()),
			statements: method.getStatements().map(statement => statement.getText()),
			returnType: method.getReturnTypeNode()?.getText(),
			overloads: method.getOverloads().map(overload => ({
				isAsync: overload.isAsync(),
				name: overload.getName(),
				isGenerator: overload.isGenerator(),
				parameters: overload.getParameters().map(param => param.getStructure()),
				typeParameters: overload.getTypeParameters().map(param => param.getStructure()),
				statements: overload.getStatements().map(statement => statement.getText()),
				returnType: overload.getReturnTypeNode()?.getText(),
			})),
		})
	}

	return sourceFile.getFunctions().map(fn => {
		const code = fn.print().trim()
		const name = fn.getName() || 'anonymous_function'
		return { name, code }
	})
}
