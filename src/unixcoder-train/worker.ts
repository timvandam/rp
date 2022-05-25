import { workerData } from 'worker_threads'
import { reportProgress, reportResult, reportTotal } from '../threading'
import { exploreFolder } from '../file-utils'
import tokenize, { Token } from 'js-tokens'
import { reduce } from '../utils'

async function createTrainString() {
	const folders = workerData as string[]
	reportTotal(folders.length)
	for (const folder of folders) {
		await exploreFolder(folder, handleFile, () => true)
		reportProgress('increment')
	}
}

createTrainString()

//TODO: Check if this should create both a TS and a JS train file, or combine them, or only JS
async function handleFile(tsCode: string, filePath: string) {
	tsCode = tsCode.trim()
	// const jsCode = ts.transpileModule(tsCode, { compilerOptions: { target: ScriptTarget.ESNext } }).outputText

	const tsTokens = tokenize(tsCode)
	// const jsTokens = tokenize(jsCode)

	const tokenStrings = replaceTemplateStrings([...tsTokens]).filter(notWhitespace).map(replaceLiterals)
	const data = `<s> ${reduce(tokenStrings, (a, b) => `${a} ${b}`, '').trim()} </s>\n`
	reportResult(data)
}

function replaceTemplateStrings(tokens: Token[]) {
	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].type === 'TemplateHead') {
			while (tokens[i].type !== 'TemplateTail') {
				tokens.splice(i, 1)
			}
			tokens[i].type = 'NoSubstitutionTemplate';
			tokens[i].value = '`asd`'
		}
	}
	return tokens
}

function notWhitespace(token: Token) {
	return token.type !== 'WhiteSpace'
}

function replaceLiterals(token: Token) {
	if (token.type === 'StringLiteral' || token.type === 'NoSubstitutionTemplate' || token.type === 'TemplateHead') {
		const startQuote = token.value[0];
		const endQuote = token.value[token.value.length - 1];
		return `${startQuote}<STR_LIT>${endQuote}`
	} else if (token.type === 'MultiLineComment') {
		const startQuote = '/*';
		const endQuote = '*/';
		return `${startQuote}<STR_LIT>${endQuote}`
	} else if (token.type === 'NumericLiteral') {
		return '<NUM_LIT>'
	} else if (token.type === 'LineTerminatorSequence') {
		return '<EOL>'
	}

	return token.value
}
