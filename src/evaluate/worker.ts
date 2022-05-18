import * as rouge from './rouge/rouge'
import { workerData } from 'worker_threads'
import { exploreFolder } from '../file-utils'
import jsTokens from 'js-tokens'
import { reportProgress, reportResult, reportTotal } from '../threading'
import { Result } from './master'
import { setTimeout } from 'timers/promises'

const a = {
	'tsMasked': 'function rootDirRequire(moduleId: string) {\\n    <mask0>\\n}\\n',
	'jsMasked': 'function rootDirRequire(moduleId) {\\n    <mask0>\\n}\\n',
	'tsTruth': ' return require(path.join(rootDir, moduleId)); ',
	'jsTruth': ' return require(path.join(rootDir, moduleId)); ',
	'tsPredictions': ['return require(moduleId);', 'return require(moduleId);', ''],
	'jsPredictions': ['return require(moduleId);', 'return require(moduleId);', '']
}

const rougeL = (a: string, b: string) => rouge.l(a, b, {
	tokenizer: (str: string) => [...jsTokens(str)].map(token => token.value),
	segmenter: (str: string) => [str],
	beta: 1
})

async function work () {
	const folder = workerData as string
	await exploreFolder(folder, async (fileContent, filePath) => {
		reportProgress('increment')

		const {
			jsTruth,
			tsPredictions,
			jsPredictions,
			tsTruth
		} = JSON.parse(fileContent) as { jsTruth: string, jsPredictions: string[], tsTruth: string, tsPredictions: string[] }

		const jsA = jsTruth.trim()
		const jsB = jsPredictions.find(x => x.trim().length > 0)?.trim()
		if (jsB === undefined) return

		const jsResult = rougeL(jsA, jsB)
		const tsResult = rougeL(jsA, jsB)
		reportResult<Result>({
			js: {
				n: 1,
				rouge: {
					l: {
						f1: jsResult.f,
						recall: jsResult.recall,
						precision: jsResult.precision
					},
					n: 0,
					s: 0,
				},
			},
			ts: {
				n: 1,
				rouge: {
					l: {
						f1: tsResult.f,
						recall: tsResult.recall,
						precision: tsResult.precision
					},
					n: 0,
					s: 0,
				},
			}
		})

		await setTimeout(1000)

	}, () => true)
}

work()
