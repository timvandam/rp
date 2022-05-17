import {access, opendir, readFile} from "fs/promises";
import path from "path";
import {PREPROCESSED_FOLDER, REPOS_FOLDER} from "./config";

/**
 * Explores folders recursively and calls a handler on specific files
 * @param folderPath Folder to explore recursively
 * @param handler Handler to apply to specific files
 * @param filter Filter used to select which files to handle
 */
export async function exploreFolder(folderPath: string, handler: (fileContent: string, filePath: string) => unknown, filter: (filePath: string) => boolean): Promise<void> {
    const dir = await opendir(folderPath)
    const promises = []

    for await (const file of dir) {
        const filePath = path.resolve(folderPath, file.name)
        if (file.isFile()) {
            if (filter(filePath)) promises.push(readFile(filePath, 'utf8').then(fileContent => handler(fileContent, filePath)))
        } else if (file.isDirectory()) {
            promises.push(exploreFolder(filePath, handler, filter))
        }
    }

    await Promise.all(promises)
}

export async function getFolderPaths(folderPath: string): Promise<string[]> {
	const dir = await opendir(folderPath)
	const folders = []

	for await (const file of dir) {
		if (file.isDirectory()) {
			folders.push(path.resolve(folderPath, file.name))
		}
	}

	return folders
}

export async function folderExists(folderPath: string): Promise<boolean> {
	try {
		await access(folderPath)
		return true
	} catch (e) {
		return false
	}
}