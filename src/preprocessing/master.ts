import cluster from 'cluster'
import * as path from 'path'
import { cpus } from 'os'
import { SingleBar } from 'cli-progress'
import { preprocess } from './worker'
import { REPOS_FOLDER, PREPROCESSED_FOLDER } from "../config";
import { folderExists, getFolderPaths } from "../file-utils";

if (cluster.isPrimary) {
	startWorkers()
} else {
	const folderPath = process.env.REPO_FOLDER
	if (typeof folderPath !== 'string') {
		throw new Error(`Invalid folder path '${folderPath}'`)
	}
	preprocess(folderPath).then(() => process.exit(0))
}

async function startWorkers() {
	const folders = await getFolderPaths(REPOS_FOLDER)

	const progressBar = new SingleBar({})
	progressBar.start(folders.length, 0)

	async function createWorker() {
		if (folders.length === 0) return
		const folderPath = folders.pop()!
		const folderName = path.basename(folderPath)

		if (await folderExists(path.resolve(PREPROCESSED_FOLDER, folderName))) {
			progressBar.setTotal(progressBar.getTotal() - 1)
			createWorker()
			return
		}

		const worker = cluster.fork({ REPO_FOLDER: folderPath })

		worker.once('error', error => {
			console.log(`Something went wrong with folder '${folderPath}': ${error.message}`)
		})

		worker.once('exit', () => {
			// Create a new worker to handle the next folder
			progressBar.increment()
			createWorker()
		})
	}

	for (let i = 0; i < cpus().length; i++) createWorker()
}

