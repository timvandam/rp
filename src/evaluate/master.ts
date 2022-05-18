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
		l: {
			recall: number;
			precision: number;
			f1: number;
		}
		s: number;
	}
}

const mergeAverages = (avg1: number, n1: number, avg2: number, n2: number) => (avg1 * n1 + avg2 * n2) / (n1 + n2)

const innerResultAggregator: DataAggregator<InnerResult, InnerResult> = (result, aggregate) => ({
	n: result.n + aggregate.n,
	rouge: {
		n: mergeAverages(result.rouge.n, result.n, aggregate.rouge.n, aggregate.n),
		l: {
			recall: mergeAverages(result.rouge.l.recall, result.n, aggregate.rouge.l.recall, aggregate.n),
			precision: mergeAverages(result.rouge.l.precision, result.n, aggregate.rouge.l.precision, aggregate.n),
			f1: mergeAverages(result.rouge.l.f1, result.n, aggregate.rouge.l.f1, aggregate.n)
		},
		s: mergeAverages(result.rouge.s, result.n, aggregate.rouge.s, aggregate.n),
	}
})
const resultAggregator: DataAggregator<Result, Result> = (result, aggregate) => ({
	js: innerResultAggregator(result.js, aggregate.js),
	ts: innerResultAggregator(result.ts, aggregate.ts)
})

const initialInnerResult: () => InnerResult = () => ({
	n: 0,
	rouge: {
		n: 0,
		l: {
			recall: 0,
			precision: 0,
			f1: 0,
		},
		s: 0
	}
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
	process.exit(0)
}

evaluate()
