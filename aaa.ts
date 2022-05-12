import { Node, Project, SyntaxKind, ts } from 'ts-morph'

// const sf = tsc.createSourceFile('x.temp', readFileSync('./test2.ts', 'utf8'), ScriptTarget.ESNext, true)
//
// const CONST = sf.statements[0]
// // console.log(sf.statements[0].getChildren(sf).map(x=>[SyntaxKind[x.kind],x.parent?SyntaxKind[x.parent.kind]:-1,x.parent]))
// // console.log(CONST.parent)
// // console.log(CONST.getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[4].getChildren().map(x => x.getFullText()))
// // const ONE = CONST.getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[4].getChildren()[0]
// // tsc.addSyntheticLeadingComment(ONE, SyntaxKind.MultiLineCommentTrivia, 'hello world', false)
// // tsc.addSyntheticTrailingComment(ONE, SyntaxKind.MultiLineCommentTrivia, 'bye world', false)
// // tsc.addSyntheticLeadingComment(CONST.parent, SyntaxKind.MultiLineCommentTrivia, 'yeet', false)
//
// function transformSourceFile(sf: SourceFile, fn: (node: Node) => void) {
// 	function transformNode(node: Node) {
// 		fn(node)
// 		node.forEachChild(transformNode)
// 	}
// 	sf.forEachChild(transformNode)
// 	for (const child of sf.getChildren()) transformNode(child)
// }
//
// tsc.transform(sf, [context => sourceFile => {
// 	transformSourceFile(sourceFile, node => {
// 		if (node.getChildCount() === 0) {
// 			tsc.addSyntheticLeadingComment(node, SyntaxKind.MultiLineCommentTrivia, 'hello world', false)
// 			tsc.addSyntheticTrailingComment(node, SyntaxKind.MultiLineCommentTrivia, 'bye world', false)
// 		}
// 	})
// 	return sourceFile
// }])
//
// const printer = tsc.createPrinter({removeComments:false})
// console.log(printer.printFile(sf))
// console.log('---------------------')

const p = new Project({ compilerOptions: { removeComments: false } })
const psf = p.createSourceFile('x.ts', `const x: number = 5 * 9;`)

function transformRecursively(node: Node, fn: (node: Node) => void): void {
	fn(node)
	node.forEachDescendant(fn)
}

psf.getStatements().forEach(x => transformRecursively(x, node => {
	ts.addSyntheticLeadingComment(node.compilerNode, SyntaxKind.MultiLineCommentTrivia, 'A', false)
}))


const x = psf.transform(traversal => {
	const node = traversal.visitChildren()
	if (node.getChildCount() === 0) {
		return ts.addSyntheticLeadingComment(node, SyntaxKind.MultiLineCommentTrivia, 'A', false)
	}
	return node
})
console.log(x.print({removeComments:false})) // no comments!
console.log(psf.print({removeComments:false})) // no comments!


/*
const sf = new Project().createSourceFile('x', readFileSync('./test2.ts', 'utf8'))

const statement = sf.getStatementsWithComments()[0].getChildren()[0].getChildren()[0]
console.log(statement.constructor)
// console.log(statement.getFullText())
// console.log(statement.getLeadingTriviaWidth())
// ts.addSyntheticTrailingComment(statement, ts.SyntaxKind.MultiLineCommentTrivia, '<mask>', false)
// ts.addSyntheticLeadingComment(statement, ts.SyntaxKind.MultiLineCommentTrivia, '</mask>', false)
// console.log(statement.getFullText())

console.log('-------')
// console.log(sf.print())
*/
