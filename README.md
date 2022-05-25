# rp

## Fetching & preprocessing data:
This will take a while
```bash
git clone git@github.com:timvandam/rp.git
# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..
npm run preprocess # get all TS functions&methods, and JS equivalents
npm run mask # masks TS & JS functions
npm run predict # applies UniXCoder and outputs results
npm run evaluate # runs metrics and reports them
```

## Preprocessing output
Preprocessing outputs one file for each function and method.
This file contains the TS function including any leading JSDocs if present.
The file name is always `[fileName].[functionName].[hash].preprocessed`.

## Mask output
Masking output is always a json object: `{ jsMasked, tsMasked, jsTruth, tsTruth }`
Mask is masked code, and truth is what statement was originally in place of the mask

## Predict output
Predict output is the same as mask output, but adds `tsPredictions` and `jsPredictions`.

# Fine-tuning UniXcoder on TS & JS
First, make sure that the files have been preprocessed (`npm run preprocess`).
Then run `npm run create-train-file` in order to create a file that UniXcoder can be trained on.
Then follow the instructions in CodeBERT/UniXcoder/downstream-tasks/code-completion, using the generated `train.txt` file instead of their dataset.
