// Look through all preprocessed function, and emit masked functions

import {exploreFolder} from "../file-utils";
import path from "path";
import {mkdir, writeFile} from "fs/promises";
import {MASKED_FOLDER, PREPROCESSED_FOLDER} from "../config";
import * as tsc from "typescript";
import {ScriptTarget, SyntaxKind} from "typescript";

export function maskAllPreprocessed(folderPath: string): Promise<void> {
    return exploreFolder(folderPath, createMaskedFiles, () => true)
}

async function createMaskedFiles(code: string, filePath: string): Promise<void> {
    try {
        const dirPath = path.dirname(filePath)
        const relDirPath = path.relative(PREPROCESSED_FOLDER, dirPath)
        const outDirPath = path.resolve(MASKED_FOLDER, relDirPath)
        const fileName = path.basename(filePath, '.preprocessed')
        const outFilePath = path.resolve(outDirPath, `${fileName}.masked.json`)

        await mkdir(outDirPath, {recursive: true})
        const json = await getMaskedFunctions(code)
        await writeFile(outFilePath, JSON.stringify(json))
    } catch (e: any) {
        console.log(`Something went wrong while masking file ${filePath}: ${e.message}`)
    }
}

/**
 * Gets masked versions of the code
 * @param code Input code (file from the Preprocessed folder)
 * @todo try multiple masks
 */
async function getMaskedFunctions(code: string): Promise<{ tsTruth: string, jsTruth: string, tsMasked: string, jsMasked: string }> {
    const sourceFile = tsc.createSourceFile('temp.ts', code, ScriptTarget.ESNext, true)
    const fn = sourceFile.statements.find(tsc.isFunctionDeclaration)

    if (fn === undefined) throw new Error('No function available')
    if (fn.body === undefined) throw new Error('No function body available')
    if (fn.body.statements.length === 0) throw new Error('Empty function body')

    const maskable = fn.body.statements // TODO: Make this an array of LINES!! Not full loops etc
    const lineToMask = Math.floor(Math.random() * maskable.length)
    const statementToMask = maskable[lineToMask]

    tsc.addSyntheticLeadingComment(statementToMask, SyntaxKind.MultiLineCommentTrivia, '<mask>', false)
    tsc.addSyntheticTrailingComment(statementToMask, SyntaxKind.MultiLineCommentTrivia, '</mask>', false)

    const maskRegex = /\/\*<mask>\*\/([\s\S]*)\/\*<\/mask>\*\//
    const tsWithMaskComment = tsc.createPrinter({ removeComments: false }).printFile(sourceFile)

    const [, tsTruth] = tsWithMaskComment.match(maskRegex)!
    const tsMasked = tsWithMaskComment.replace(maskRegex, '<mask0>')

	const jsWithMaskComment = tsc.transpileModule(tsWithMaskComment, { compilerOptions: { removeComments: false, target: ScriptTarget.ESNext } }).outputText
    const [, jsTruth] = jsWithMaskComment.match(maskRegex)!
    const jsMasked = jsWithMaskComment.replace(maskRegex, '<mask0>')
	return { tsMasked, jsMasked, tsTruth, jsTruth }
}