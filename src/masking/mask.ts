import * as tsc from 'typescript'
import { Node, ScriptTarget, SyntaxKind } from 'typescript'

// n is 0 indexed
function replaceNthOccurrence(str: string, keyword: string, n: number, replacement: string = ''): string {
	let i = 0
	return str.replace(new RegExp(keyword, 'g'), match => i++ === n ? replacement : match)
}

function reduceNode<T>(node: Node, fn: (acc: T, node: Node) => T, initial: T): T {
	let cur = fn(initial, node)
	node.forEachChild(child => {
		cur = reduceNode(child, fn, cur)
	})
	return cur
}

export function maskSingleToken(code: string): { ts: string; js: string; } {
	const sourceFile = tsc.createSourceFile('temp.ts', code, ScriptTarget.ESNext, true)
	const [fn] = sourceFile.statements.filter(tsc.isFunctionDeclaration)

	const body = fn.body
	if (body === undefined) throw new Error('No function body available')

	// TODO: Not just leafs
	const leafCount = reduceNode(body, (t, n) => t + (n.getChildCount() === 0 ? 1 : 0), 0)
	const leafToMask = Math.floor(Math.random() * leafCount)
	//TODO: Exit sooner
	reduceNode(body, (r, n) => {
		if (n.getChildCount() !== 0) return r
		if (r === 0) {
			// We are at the token that will be masked
			tsc.addSyntheticLeadingComment(n, SyntaxKind.MultiLineCommentTrivia, '<mask>', false)
			tsc.addSyntheticTrailingComment(n, SyntaxKind.MultiLineCommentTrivia, '</mask>', false)
		}
		return r - 1
	}, leafToMask)

	return {
		ts: tsc.createPrinter({ removeComments: false }).printFile(sourceFile),
		js: 'asd' // TODO
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
    const now = new Date().getTime();
    if (group) {
        return { group, timestamp: now };
    }
    else {
        return undefined;
    }
}
`)
console.log(`${res.ts}\n-------------------------\n${res.js}`)
