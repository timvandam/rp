import {spawn} from "child_process";
import path from "path";
import {createInterface} from "readline";

export async function* getTsFilesRecursively(folder: string): AsyncIterable<string> {
    const spawned = spawn(
        'find',
        [
            `"${path.resolve(folder)}"`,
            '-type',
            'f',
            '-name',
            '"*.ts"'
        ],
        {
            shell: true
        }
    );

    spawned.on('error', error => {
        console.log('Something went wrong while fetching files')
        console.log(error);
        process.exit(1);
    })

    const lines = createInterface({
        input: spawned.stdout,
        crlfDelay: Infinity,
    });

    for await (const line of lines) {
        yield path.relative(folder, line);
    }
}