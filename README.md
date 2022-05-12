# rp

## Fetching & preprocessing data:
This will take a while0
```bash
git clone git@github.com:timvandam/rp.git
# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..
npm run process-ts # get all TS functions&methods, and JS equivalents
npm run evaluate # TODO
```

## Preprocessing output
Preprocessing outputs one file for each function.
This file contains both the TS and the JS equivalent, and is stored as follows:
```ts
/* <TS> */
/**
 * comments are preserved
 * @param input
 */
function abc(input: string): string {
	return input
}
/* </TS> */

/* <JS> */
/**
 * comments are preserved
 * @param input
 */
function abc(input) {
	return input
}
/* </JS> */
```
The first function is the TS function, and the second function is the JS equivalent.
The file name is always `[fileName].[functionName].[hash].preprocessed`.
