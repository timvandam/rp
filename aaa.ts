import * as tsc from 'typescript'
import { ScriptTarget, SyntaxKind } from 'typescript'
import { readFileSync } from 'fs'

const sf = tsc.createSourceFile('x.temp', readFileSync('./test2.ts', 'utf8'), ScriptTarget.ESNext, true)

const CONST = sf.statements[0]
// console.log(sf.statements[0].getChildren(sf).map(x=>[SyntaxKind[x.kind],x.parent?SyntaxKind[x.parent.kind]:-1,x.parent]))
// console.log(CONST.parent)
console.log(CONST.getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[4].getChildren().map(x => x.getFullText()))
const ONE = CONST.getChildren()[0].getChildren()[1].getChildren()[0].getChildren()[4].getChildren()[0]
tsc.addSyntheticLeadingComment(ONE, SyntaxKind.MultiLineCommentTrivia, 'hello world', false)
tsc.addSyntheticTrailingComment(ONE, SyntaxKind.MultiLineCommentTrivia, 'bye world', false)
// tsc.addSyntheticLeadingComment(CONST.parent, SyntaxKind.MultiLineCommentTrivia, 'yeet', false)
// @ts-ignore

console.log('---------------------')
const printer = tsc.createPrinter({removeComments:false})
console.log(printer.printFile(sf))

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
