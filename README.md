# rp

## Fetching & preprocessing data:
This will take a while
```bash
git clone git@github.com:timvandam/rp.git
# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..
npm run preprocess # get all TS functions&methods, and JS equivalents
npm run mask # masks TS & JS functions
npm run evaluate # TODO
```

## Preprocessing output
Preprocessing outputs one file for each function and method.
This file contains the TS function including any leading JSDocs if present.
The file name is always `[fileName].[functionName].[hash].preprocessed`.

## Mask output
Masking output is always a json object: `{ jsMasked, tsMasked, jsTruth, tsTruth }`
Mask is masked code, and truth is what statement was originally in place of the mask