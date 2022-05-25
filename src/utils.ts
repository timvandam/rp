export function randInt(min: number, max: number): number {
	if (!Number.isInteger(min)) throw new Error('Min is not an integer')
	if (!Number.isInteger(max)) throw new Error('Max is not an integer')
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function batchBySize<T>(jobs: T[], batchSize: number): T[][] {
	const result: T[][] = []
	for (let i = 0; i < jobs.length; i += batchSize) {
		result.push(jobs.slice(i, i + batchSize))
	}
	return result
}

export function batchByAmount<T>(jobs: T[], batchCount: number): T[][] {
	return batchBySize(jobs, Math.ceil(jobs.length / batchCount))
}

export function* map<T, R>(iterable: Iterable<T>, mapper: (value: T) => R): Generator<R> {
	for (const value of iterable) {
		yield mapper(value)
	}
}

export function reduce<T, R>(iterable: Iterable<T>, reducer: (accumulator: R, value: T) => R, initialValue: R): R {
	let accumulator = initialValue
	for (const value of iterable) {
		accumulator = reducer(accumulator, value)
	}
	return accumulator
}
