import { readFile, writeFile, opendir, mkdir } from 'fs/promises'
import { createHash } from 'crypto'
import { Project, ScriptTarget } from 'ts-morph'
import * as path from 'path'

//TODO: Parralellization to speed it up
//TODO: Progress bar

// amount of files to process at one time
const BATCH_SIZE = 10
const REPO_FOLDER = './data/Repos'
const RESULT_FOLDER = './data/Processed'

const IGNORED_FOLDERS = ['.git', 'node_modules', '.idea', '.vscode', '.circleci']

const sha256 = (str: string) => createHash('sha256').update(str).digest().toString('hex')

exploreFolder(REPO_FOLDER + '/0xProject')

async function exploreFolder(folderPath: string): Promise<void> {
	const dir = await opendir(folderPath)
	const promises = []
	
	for await (const file of dir) {
		if (file.isFile()) {
			const fileName = file.name.toLowerCase()
			if (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) promises.push(handleTSFile(path.resolve(folderPath, file.name)))
		} else if (file.isDirectory() && !IGNORED_FOLDERS.includes(file.name.toLowerCase())) {
			promises.push(exploreFolder(path.resolve(folderPath, file.name)))
		}
	}

	await Promise.all(promises)
}

async function handleTSFile(filePath: string) {
	const dirPath = path.dirname(filePath)
	const relDirPath = path.relative(REPO_FOLDER, dirPath)
	const outDirPath = path.resolve(RESULT_FOLDER, relDirPath)

	const fileName = path.basename(filePath, '.ts')

	const code = await readFile(filePath, 'utf8')

	const promises = []

	await mkdir(outDirPath, { recursive: true })
	for (const { name, code: tsCode } of await getTSFunctionsAndMethods(code)) {
		const jsCode = tsToJS(tsCode).trim()
		const content = `/* <TS> */\n${tsCode}\n/* </TS> */\n\n/* <JS> */\n${jsCode}\n/* </JS> */`
		const outFileName = `${fileName}.${name}.${sha256(content).slice(0, 10)}.preprocessed`
		const outFilePath = path.resolve(outDirPath, outFileName)
		promises.push(writeFile(outFilePath, content))
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
		const name = fn.getName() ?? 'anonymous_function'
		return { name, code }
	})
}

export function tsToJS(code: string) {
	const project = new Project({ compilerOptions: { target: ScriptTarget.ESNext }})
	const sourceFile = project.createSourceFile('temp.ts', code)
	return sourceFile.getEmitOutput().getOutputFiles()[0].getText() // TODO: Make sure this works in pretty much all cases
}
