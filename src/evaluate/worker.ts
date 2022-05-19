import * as rouge from './rouge/rouge'
import { workerData } from 'worker_threads'
import { exploreFolder } from '../file-utils'
import jsTokens from 'js-tokens'
import { reportProgress, reportResult, reportTotal } from '../threading'
import { Result } from './master'
import { distance } from 'fastest-levenshtein'

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
	const folders = workerData as string[]
	reportTotal(folders.length)
	for (const folder of folders) {
		await exploreFolder(folder, async (fileContent) => {
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
					exactMatchAll: Number(jsPredictions.some(x => x.trim() === jsA)),
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
					exactMatchAll: Number(tsPredictions.some(x => x.trim() === tsA)),
					levenshtein: distance(tsA, tsB) / Math.max(tsA.length, tsB.length)
				}
			})
		}, () => true)
		reportProgress('increment')
	}
}

work()
