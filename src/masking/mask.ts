import { Project, ScriptTarget } from 'ts-morph'

// n is 0 indexed
function replaceNthOccurrence(str: string, keyword: string, n: number, replacement: string = ''): string {
	let i = 0
	return str.replace(new RegExp(keyword, 'g'), match => i++ === n ? replacement : match)
}

export function maskCode(code: string): { ts: string; js: string; } {
	const project = new Project({ compilerOptions: { target: ScriptTarget.ESNext } })
	const sourceFile = project.createSourceFile('temp.ts', code)
	const [fn] = sourceFile.getFunctions()

	const body = fn.getBody()?.print({ removeComments: true })
	if (body === undefined) throw new Error('No function body available')

	//TODO: Better token selection
	const tokens = body.split(/[.\s;(){}*^%/\-+=]/).filter(x => x.length > 0)
	const tokenIndex = Math.floor(Math.random() * tokens.length)
	const maskedToken = tokens[tokenIndex]
	const tokenPrevCount = tokens.slice(0, tokenIndex).reduce((count, token) => count + (token === maskedToken ? 1 : 0), 0)

	fn.setBodyText(replaceNthOccurrence(body, maskedToken, tokenPrevCount, `/* <mask> */ ${maskedToken} /* </mask> */`))

	return {
		ts: sourceFile.getFullText(),
		js: sourceFile.getEmitOutput().getOutputFiles()[0].getText()
	}
}


