import { createWriteStream } from 'fs'
import { rm } from 'fs/promises'
import * as path from 'path'
import { ALLOWED_CPUS, PREPROCESSED_FOLDER } from '../config'
import { getFolderPaths } from "../file-utils";
import { multithread } from '../threading'
import { batchBySize } from '../utils'
import { TRAIN_FILE } from '../config'

async function startWorkers() {
	const folders = await getFolderPaths(PREPROCESSED_FOLDER)
	await rm(TRAIN_FILE, { force: true })
	const writeStream = createWriteStream(TRAIN_FILE, 'utf8')
	await multithread(
		batchBySize(folders, 5),
		path.resolve(__dirname, './worker.js'),
		(str: string) => {
			writeStream.write(str)
			return 0
		},
		0,
		ALLOWED_CPUS
	)
	writeStream.end()
}

startWorkers()
