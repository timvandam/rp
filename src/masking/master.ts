import * as path from 'path'
import { PREPROCESSED_FOLDER } from "../config";
import { getFolderPaths } from "../file-utils";
import { multithread } from '../threading'
import { batchBySize } from '../utils'
import os from 'os'

async function startWorkers() {
	const folders = await getFolderPaths(PREPROCESSED_FOLDER)
	await multithread(
		batchBySize(folders, 5),
		path.resolve(__dirname, './worker.js'),
		() => 0,
		0,
		os.cpus().length
	)
}

startWorkers()



