import { readFile, writeFile, opendir, mkdir } from 'fs/promises'
import { createHash } from 'crypto'
import { Project, ScriptTarget } from 'ts-morph'
import { REPOS_FOLDER, RESULT_FOLDER } from './master'
import * as path from 'path'

export async function exploreFolder(folderPath: string): Promise<void> {
	const dir = await opendir(folderPath)
	const promises = []

	for await (const file of dir) {
		if (file.isFile()) {
			const fileName = file.name.toLowerCase()
			if (fileName.endsWith('.ts')) promises.push(handleTSFile(path.resolve(folderPath, file.name)))
		} else if (file.isDirectory()) {
			promises.push(exploreFolder(path.resolve(folderPath, file.name)))
		}
	}

	await Promise.all(promises)
}

const sha256 = (str: string) => createHash('sha256').update(str).digest().toString('hex')

async function handleTSFile(filePath: string) {
	const dirPath = path.dirname(filePath)
	const relDirPath = path.relative(REPOS_FOLDER, dirPath)
	const outDirPath = path.resolve(RESULT_FOLDER, relDirPath)

	const fileName = path.basename(filePath, '.ts')

	const code = await readFile(filePath, 'utf8')

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