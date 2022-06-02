# rp

## Fetching, preprocessing, masking, predicting, and evaluating
This will take a while
```bash
git clone git@github.com:timvandam/rp.git
# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..
npm run get-functions # extract TS functions
npm run split-data # split data into train/test/validation
npm run create-model-files # create train + validation files for UniXcoder finetuning
npm run predict # apply UniXcoder to test set
npm run evaluate # runs metrics and reports them
```

## Preprocessing output
Preprocessing outputs one file for each function and method.
This file contains the TS function including any leading JSDocs if present.
The file name is always `[fileName].[functionName].[hash].ts`.

## Mask output
Masking outputs one file for each masked version of a function.
One function might be masked multiple times.
The config file (`config.json`) can be used to set what % of lines should be masked.
Masking output is always a json object: `{ ts: { gt: string, input: string }, js: { gt: string, input: string } }`
The file name is always `[fileName].[i].json`, where `fileName` is the name of the preprocessed file, and `i` is a number to differentiate different masked version of the same function. 

## Predict output
Prediction outputs one language as a time, as prediction requires two separate processes to run (one for JS, one for TS).
The output is `{ "input": string, "gt": string, "predictions": string[] }`, and the file names are similar to that of the masked files: `[fileName].[i].[language].json``

# Fine-tuning UniXcoder on TS
First, make sure that the files have been preprocessed (`npm run preprocess`).
Then run `npm run create-train-file` in order to create a file that UniXcoder can be trained on.
Then follow the instructions in CodeBERT/UniXcoder/downstream-tasks/code-completion, using the generated `train.txt` file instead of their dataset.
