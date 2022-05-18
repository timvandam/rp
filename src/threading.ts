import threads, {Worker} from 'worker_threads'
import { MultiBar, Presets } from 'cli-progress'

export type DataAggregator<R, A> = (result: R, aggregate: A) => A

function report(name: string, value: unknown) {
    if (threads.parentPort === undefined) {
        throw new Error('No parent port. Is this a worker?')
    }

    threads.parentPort!.postMessage(JSON.stringify({ [name]: value }))
}

export const reportTotal = (total: number) => report('total', total)
export const reportProgress = (progress: number | string) => report('progress', progress)
export function reportResult<R>(result: R) {
    return report('result', result)
}


export async function multithread<T, R, A>(jobs: T[], workerFilePath: string, dataAggregator: DataAggregator<R, A>, initialDataAggregate: A, maxWorkers: number): Promise<A> {
    const workers: (Worker | undefined)[] = Array(maxWorkers).fill(undefined)
    const bar = new MultiBar({
        format: '{filename}\t| {bar} | {percentage} %\t| {value} / {total}'
    }, Presets.shades_grey)
    const bars = workers.map((_, i) => bar.create(0, 0, { filename: `T${i}\t` }))
    const jobsBar = bar.create(jobs.length, 0, { filename: 'Jobs\t' })
    let aggregate = initialDataAggregate

    function createWorker(index: number): Promise<void> {
        return new Promise(resolve => {
            if (jobs.length === 0) {
                workers[index] = undefined;
                resolve()
                return
            }

            const worker = new Worker(workerFilePath, { workerData: jobs.shift() })
            workers[index] = worker

            worker.once('error', (error) => {
                console.log(`An error occurred in thread ${index}: ${error}`)
            })

            worker.on('message', message => {
                try {
                    const data = JSON.parse(message)
                    if ('total' in data && typeof data['total'] === 'number') {
                        bars[index].setTotal(data['total'])
                    }
                    if ('progress' in data) {
                        if (typeof data['progress'] === 'number') {
                            bars[index].update(data['progress'])
                        } else if (data['progress'] === 'increment') {
                            bars[index].increment()
                        }
                    }
                    if ('result' in data) {
                        aggregate = dataAggregator(data['result'], aggregate)
                    }
                } catch (e) {
                    console.log(`Invalid message from thread ${index}: ${message}`)
                }
            })

            worker.once('exit', () => {
                worker.removeAllListeners()
                jobsBar.increment()
                createWorker(index).then(() => resolve())
            })
        })
    }


    await Promise.all(Array.from({ length: maxWorkers }, (_, i) => createWorker(i)))

    bar.stop()

    return aggregate
}

export const arrayAggregator: [DataAggregator<unknown, unknown[]>, []] = [(result, aggregate) => [...aggregate, result], []]
