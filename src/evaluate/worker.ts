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

const computeMetrics = (truth: string, prediction: string, predictions: string[]) => ({
	n: 1,
	rouge: {
		l: rougeL(truth, prediction),
		n: rougeN(truth, prediction),
		s: rougeS(truth, prediction),
	},
	exactMatch: Number(truth === prediction),
	exactMatchAll: Number(predictions.some(x => x.trim() === truth)),
	levenshtein: distance(truth, prediction) / Math.max(truth.length, prediction.length)
})

async function work () {
	const folders = workerData as string[]
	reportTotal(folders.length)
	for (const folder of folders) {
		await exploreFolder(folder, async (fileContent) => {
			const {
				jsTruth, // TODO: Remove comments from truth
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
				js: computeMetrics(jsA, jsB, jsPredictions),
				ts: computeMetrics(tsA, tsB, tsPredictions)
			})
		}, () => true)
		reportProgress('increment')
	}
}

work()
