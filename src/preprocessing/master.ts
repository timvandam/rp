import { opendir, access} from 'fs/promises'
import cluster from 'cluster'
import * as path from 'path'
import { cpus } from 'os'
import { SingleBar } from 'cli-progress'
import { exploreFolder } from './worker'

export const REPOS_FOLDER = './data/Repos'
export const RESULT_FOLDER = './data/Processed'

if (cluster.isPrimary) {
	preprocess()
} else {
	const folder = process.env.REPO_FOLDER
	if (typeof folder !== 'string') throw new Error(`Invalid folder '${folder}'`)
	exploreFolder(folder).then(() => process.exit(0))
}

async function preprocess() {
	const folders = await getAllRepos()

	const progressBar = new SingleBar({})
	progressBar.start(folders.length, 0)

	async function createWorker() {
		if (folders.length === 0) return
		const folderPath = folders.pop()!
		const folderName = path.basename(folderPath)

		if (await folderExists(path.resolve(RESULT_FOLDER, folderName))) {
			progressBar.setTotal(progressBar.getTotal() - 1)
			createWorker()
			return
		}

		const worker = cluster.fork({ REPO_FOLDER: folderPath })

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
