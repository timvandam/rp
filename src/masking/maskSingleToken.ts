// This file is no longer relevant since the task has been switched to statement prediction instead of single token prediction
import * as tsc from 'typescript'
import {ScriptTarget, SyntaxKind} from 'typescript'
import {reduceNode} from "../ast-utils";

export function maskSingleToken(code: string): { ts: string; js: string; } {
	const sourceFile = tsc.createSourceFile('temp.ts', code, ScriptTarget.ESNext, true)
	const fn = sourceFile.statements.find(tsc.isFunctionDeclaration)

	if (fn === undefined) throw new Error('No function available')
	if (fn.body === undefined) throw new Error('No function body available')

	// TODO: Not just leafs
	const leafCount = reduceNode(fn.body, (t, n) => t + (n.getChildCount() === 0 ? 1 : 0), 0)
	const leafToMask = Math.floor(Math.random() * leafCount)
	//TODO: Dont mask variable names, object keys, etc
	//TODO: Exit sooner
	// TODO: Allow operator masking
	//		- Maybe wrap in NodeObject
	reduceNode(fn.body, (r, n) => {
		if (n.getChildCount() !== 0) return r
		if (r === 0) {
			// We are at the token that will be masked
			tsc.addSyntheticLeadingComment(n, SyntaxKind.MultiLineCommentTrivia, '<mask>', false)
			tsc.addSyntheticTrailingComment(n, SyntaxKind.MultiLineCommentTrivia, '</mask>', false)
		}
		return r - 1
	}, leafToMask)

	const tsOutput = tsc.createPrinter({ removeComments: false }).printFile(sourceFile)
	const jsOutput = tsc.transpileModule(tsOutput, { compilerOptions: { removeComments: false, target: ScriptTarget.ESNext } }).outputText
	return {
		ts: tsOutput,
		js: jsOutput
	}
}


const res = maskSingleToken(`/**
 * Factory for \`CacheableGroup\` objects.
 *
 * @export
 * @param {Group} group - group to be cached
 * @returns {CacheableGroup | undefined}
 */
export function cacheableGroupFactory(group: Group): CacheableGroup | undefined {
    const now = new Date().getTime() * 123;
    if (group) {
        return { group, timestamp: now };
    }
    else {
        return undefined;
    }
}
`)
console.log(`${res.ts}\n-------------------------\n${res.js}`)


function countWords(str: string): number {
	const words = str.split(" ");
	return words.length;
}

