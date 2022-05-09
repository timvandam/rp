import { opendir, access} from 'fs/promises'
import { Worker, isMainThread } from 'worker_threads'
import * as path from 'path'
import { cpus } from 'os'
import { SingleBar } from 'cli-progress'

export const REPOS_FOLDER = './data/Repos'
export const RESULT_FOLDER = './data/Processed'

if (isMainThread) process()

async function process() {
	const folders = await getAllRepos()

	const progressBar = new SingleBar({})
	progressBar.start(folders.length, 0)

	async function createWorker() {
		if (folders.length === 0) return
		const folderPath = folders.pop()!
		const folderName = path.basename(folderPath)

		if (await folderExists(path.resolve(RESULT_FOLDER, folderName))) {
			progressBar.increment()
			createWorker()
			return
		}

		const worker = new Worker(path.resolve(__dirname, 'worker.js'), { workerData: folderPath })

		worker.on('error', error => {
			console.log(`Something went wrong with folder '${folderPath}': ${error.message}`)
		})

		worker.on('exit', () => {
			// Create a new worker to handle the next folder
			progressBar.increment()
			createWorker()
		})
	}

	for (let i = 0; i < cpus().length; i++) createWorker()
}

async function folderExists(folderPath: string): Promise<boolean> {
	try {
		await access(folderPath)
		return true
	} catch (e) {
		return false
	}
}

async function getAllRepos(): Promise<string[]> {
	const dir = await opendir(REPOS_FOLDER)
	const folders = []

	for await (const file of dir) {
		if (file.isDirectory()) {
			folders.push(path.resolve(REPOS_FOLDER, file.name))
		}
	}

	return folders
}
