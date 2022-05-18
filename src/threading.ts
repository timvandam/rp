import threads, {Worker} from 'worker_threads'
import {MultiBar} from 'cli-progress'

type DataAggregator<R, A> = (result: R, aggregate: A) => A

export async function multithread<T, R, A>(jobs: T[], workerFn: (task: T) => R, dataAggregator: DataAggregator<R, A>, initialDataAggregate: A, maxWorkers: number): Promise<A> {
    const workers: (Worker | undefined)[] = Array(maxWorkers).fill(undefined)
    const bar = new MultiBar({})
    const bars = workers.map((_, i) => bar.create(0, 0, { filename: `Thread ${i}` }))
    const jobsBar = bar.create(jobs.length, 0, { filename: 'Jobs' })

    function createWorker(index: number) {
        if (jobs.length === 0) {
            workers[index] = undefined;
            return
        }

        const worker = new Worker(workerFn.toString(), { eval: true, workerData: jobs.shift() })
        workers[index] = worker

        worker.once('error', (error) => {
            console.log(`An error occurred in thread ${i}: ${error?.message ?? error}`)
        })

        worker.on('message', message => {
            try {
                const data = JSON.parse(message)
                if ('total' in data && typeof data['total'] === 'number') {
                    bars[index].setTotal(data['total'])
                }
                if ('progress' in data && typeof data['progress'] === 'number') {
                    bars[index].update(data['progress'])
                }
            } catch (e) {
                console.log(`Invalid message from thread ${index}: ${message}`)
            }
        })

        worker.once('exit', () => {
            console.log(`Thread ${index} finished`)
            worker.removeAllListeners()
            jobsBar.increment()
            createWorker(index)
        })
    }

    for (let i = 0; i < maxWorkers; i++) {

        const worker = createWorker(i)
    }
    // TODO: Multibar
}

export const arrayAggregator: [DataAggregator<unknown, unknown[]>, []] = [(result, aggregate) => [...aggregate, result], []]
