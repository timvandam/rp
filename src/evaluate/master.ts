import { getFolderPaths } from '../file-utils'
import { PREDICTED_FOLDER } from '../config'
import { DataAggregator, multithread } from '../threading'
import * as os from 'os'
import { writeFile } from 'fs/promises'
import * as path from 'path'

export type Result = { js: InnerResult, ts: InnerResult }
type InnerResult = {
	n: number;
	rouge: {
		n: number;
		l: RougeResult;
		s: RougeResult;
	};
	exactMatch: number;
	levenshtein: number;
}

type RougeResult = {
	recall: number;
	precision: number;
	f: number;
}

const mergeAverages = (avg1: number, n1: number, avg2: number, n2: number) => (avg1 * n1 + avg2 * n2) / (n1 + n2)

const rougeResultAggregator: (resultN: number, aggregateN: number) => DataAggregator<RougeResult, RougeResult> = (resultN, aggregateN) => (result, aggregate) => ({
	recall: mergeAverages(result.recall, resultN, aggregate.recall, aggregateN),
	precision: mergeAverages(result.precision, resultN, aggregate.precision, aggregateN),
	f: mergeAverages(result.f, resultN, aggregate.f, aggregateN)
})
const innerResultAggregator: DataAggregator<InnerResult, InnerResult> = (result, aggregate) => ({
	n: result.n + aggregate.n,
	rouge: {
		n: mergeAverages(result.rouge.n, result.n, aggregate.rouge.n, aggregate.n),
		l: rougeResultAggregator(result.n, aggregate.n)(result.rouge.l, aggregate.rouge.l),
		s: rougeResultAggregator(result.n, aggregate.n)(result.rouge.s, aggregate.rouge.s),
	},
	exactMatch: mergeAverages(result.exactMatch, result.n, aggregate.exactMatch, aggregate.n),
	levenshtein: mergeAverages(result.levenshtein, result.n, aggregate.levenshtein, aggregate.n)
})
const resultAggregator: DataAggregator<Result, Result> = (result, aggregate) => ({
	js: innerResultAggregator(result.js, aggregate.js),
	ts: innerResultAggregator(result.ts, aggregate.ts)
})

const initialRougeResult: () => RougeResult = () => ({
	recall: 0,
	precision: 0,
	f: 0,
})
const initialInnerResult: () => InnerResult = () => ({
	n: 0,
	rouge: {
		n: 0,
		l: initialRougeResult(),
		s: initialRougeResult()
	},
	exactMatch: 0,
	levenshtein: 0,
})

const initialResult: Result = { js: initialInnerResult(), ts: initialInnerResult() }

async function evaluate() {
	const folders = await getFolderPaths(PREDICTED_FOLDER)
	const result = await multithread(
		folders,
		path.resolve(__dirname, './worker.js'),
		resultAggregator,
		initialResult,
		os.cpus().length
	)
	await writeFile('./data/Evaluation.json', JSON.stringify(result, null, 2))
}

evaluate()
