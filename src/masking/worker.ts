// Look through all preprocessed function, and emit masked functions

import { exploreFolder } from '../file-utils'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { MASKED_FOLDER, PREPROCESSED_FOLDER } from '../config'
import { Project, ScriptTarget, ts } from 'ts-morph'
import { randInt } from '../utils'
import { workerData } from 'worker_threads'
import { reportProgress, reportTotal } from '../threading'

async function maskAllPreprocessed () {
	const folders = workerData as string[]
	reportTotal(folders.length)
	for (const folder of folders) {
		await exploreFolder(folder, createMaskedFiles, () => true)
		reportProgress('increment')
	}
}

maskAllPreprocessed()

const NO_FUNCTION = new Error('No function available')
const NO_FUNCTION_STATEMENTS = new Error('No function statements')
const NO_FUNCTION_BODY = new Error('No function body available')
const NO_FUNCTION_BODY_LINES = new Error('Function body has no lines')
const NO_MASKABLE_LINE = new Error('Could not find a maskable line')
const ERRORS = [
	NO_FUNCTION,
	NO_FUNCTION_STATEMENTS,
	NO_FUNCTION_BODY,
	NO_FUNCTION_BODY_LINES,
	NO_MASKABLE_LINE
]

async function createMaskedFiles(code: string, filePath: string): Promise<void> {
	try {
		const dirPath = path.dirname(filePath)
		const relDirPath = path.relative(PREPROCESSED_FOLDER, dirPath)
		const outDirPath = path.resolve(MASKED_FOLDER, relDirPath)
		const fileName = path.basename(filePath, '.preprocessed')
		const outFilePath = path.resolve(outDirPath, `${ fileName }.masked.json`)

		await mkdir(outDirPath, {recursive: true})
		const json = getMaskedFunctions(code)
		await writeFile(outFilePath, JSON.stringify(json))
	} catch (e: any) {
		// if (!ERRORS.includes(e)) console.log(e)
	}
}

const mask = (str: string) => `/*<mask_line>*/${ str }`
const MASK_REGEX = /\/\*<mask_line>\*\/(.+)/ // something prefixed by mask_line
const COMMENT_REGEX = /^\/\/.+|\/\*.+\*\/$/ // full line comments

/**
 * Gets masked versions of the code
 * @param code Input code (file from the Preprocessed folder)
 * @todo try multiple masks
 * @todo make this work properly. currently it sucks
 */
function getMaskedFunctions (code: string): { tsTruth: string, jsTruth: string, tsMasked: string, jsMasked: string } {
	const project = new Project({
		compilerOptions: {
			removeComments: false,
			target: ScriptTarget.ESNext
		}
	})
	const sourceFile = project.createSourceFile('temp.ts', code)
	const [fn] = sourceFile.getFunctions()

	if (fn === undefined) throw NO_FUNCTION
	if (fn.getStatements().length === 0) throw NO_FUNCTION_STATEMENTS

	const fnBodyText = fn.getBodyText()
	if (fnBodyText === undefined) throw NO_FUNCTION_BODY

	const fnBodyLines = fnBodyText.split(/[\r\n]+/)
	if (fnBodyLines.length === 0) throw NO_FUNCTION_BODY_LINES

	// Try finding a suitable place to mask 10x. Required because masking might fail when we mask a line with types
	for (let i = 0; i < 10; i++) {
		const lineToMask = randInt(0, fnBodyLines.length - 1)
		const originalLine = fnBodyLines[lineToMask]

		// Don't mask lines that are comments
		if (fnBodyLines[lineToMask].trim().match(COMMENT_REGEX) !== null) {
			continue
		}

		fnBodyLines[lineToMask] = mask(fnBodyLines[lineToMask])
		fn.setBodyText(fnBodyLines.join('\n'))

		const tsWithMaskComment = ts.createPrinter({removeComments: false}).printFile(sourceFile.compilerNode)


		// Sometimes comments are added in places where they can't be added, leading to them disappearing
		let match = tsWithMaskComment.match(MASK_REGEX)
		if (match === null) {
			fnBodyLines[lineToMask] = originalLine
			continue
		}
		const [, tsTruth] = match
		const tsMasked = tsWithMaskComment.replace(MASK_REGEX, '<mask0>')

		const jsWithMaskComment = ts.transpileModule(tsWithMaskComment, {
			compilerOptions: {
				removeComments: false,
				target: ScriptTarget.ESNext
			}
		}).outputText

		// If the mask can't be found we may have masked some types that are no longer present
		match = jsWithMaskComment.match(MASK_REGEX)
		if (match === null) {
			fnBodyLines[lineToMask] = originalLine
			continue
		}

		const [, jsTruth] = match
		const jsMasked = jsWithMaskComment.replace(MASK_REGEX, '<mask0>')

		return {tsMasked, jsMasked, tsTruth, jsTruth}
	}

	// If we get here, we could not find a suitable place to mask.
	throw NO_MASKABLE_LINE
	// TODO: Perhaps loop through lines and try one by one (with random starting point to undo bias)
}
