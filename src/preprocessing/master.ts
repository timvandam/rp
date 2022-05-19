import cluster from 'cluster'
import * as path from 'path'
import { ALLOWED_CPUS, REPOS_FOLDER } from '../config'
import { getFolderPaths } from "../file-utils";
import { multithread } from '../threading'
import { batchBySize } from '../utils'

async function startWorkers() {
	const folders = await getFolderPaths(REPOS_FOLDER)
	await multithread(
		batchBySize(folders, 5),
		path.resolve(__dirname, './worker.js'),
		() => 0,
		0,
		ALLOWED_CPUS
	)
}

startWorkers()
