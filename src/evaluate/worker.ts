import * as rouge from './rouge/rouge'
import { workerData } from 'worker_threads'
import { exploreFolder } from '../file-utils'
import jsTokens from 'js-tokens'
import { reportProgress, reportResult, reportTotal } from '../threading'
import { Result } from './master'
import { setTimeout } from 'timers/promises'
import { distance } from 'fastest-levenshtein'

const a = {
	'tsMasked': 'function rootDirRequire(moduleId: string) {\\n    <mask0>\\n}\\n',
	'jsMasked': 'function rootDirRequire(moduleId) {\\n    <mask0>\\n}\\n',
	'tsTruth': ' return require(path.join(rootDir, moduleId)); ',
	'jsTruth': ' return require(path.join(rootDir, moduleId)); ',
	'tsPredictions': ['return require(moduleId);', 'return require(moduleId);', ''],
	'jsPredictions': ['return require(moduleId);', 'return require(moduleId);', '']
}

const tokenizer = (str: string) => [...jsTokens(str)].map(token => token.value)

const rougeL = (a: string, b: string) => rouge.l(a, b, {
	tokenizer,
	segmenter: (str: string) => [str],
	beta: 1
})

const rougeS = (a: string, b: string) => rouge.s(a, b, {
	tokenizer,
	skipBigram: (str: string[]) => str,
	beta: 1
})

const rougeN = (a: string, b: string) => rouge.n(a, b, {
	tokenizer
})

async function work () {
	const folder = workerData as string
	reportTotal(150) // we can not predict how many files we will have to handle, so just a random value so the bars move
	await exploreFolder(folder, async (fileContent, filePath) => {
		reportProgress('increment')

		const {
			jsTruth,
			jsPredictions,
			tsTruth,
			tsPredictions,
		} = JSON.parse(fileContent) as { jsTruth: string, jsPredictions: string[], tsTruth: string, tsPredictions: string[] }

		const jsA = jsTruth.trim()
		const jsB = jsPredictions.find(x => x.trim().length > 0)?.trim()
		if (jsB === undefined) return

		const tsA = tsTruth.trim()
		const tsB = tsPredictions.find(x => x.trim().length > 0)?.trim()
		if (tsB === undefined) return

		reportResult<Result>({
			js: {
				n: 1,
				rouge: {
					l: rougeL(jsA, jsB),
					n: rougeN(jsA, jsB),
					s: rougeS(jsA, jsB),
				},
				exactMatch: Number(jsA === jsB),
				levenshtein: distance(jsA, jsB) / Math.max(jsA.length, jsB.length)
			},
			ts: {
				n: 1,
				rouge: {
					l: rougeL(tsA, tsB),
					n: rougeN(tsA, tsB),
					s: rougeS(tsA, tsB),
				},
				exactMatch: Number(tsA === tsB),
				levenshtein: distance(tsA, tsB) / Math.max(tsA.length, tsB.length)
			}
		})

		await setTimeout(1000)

	}, () => true)
}

work()
