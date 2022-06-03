# rp

## Fetching, preprocessing, masking, predicting, and evaluating
This will take a while
```bash
git clone git@github.com:timvandam/rp.git
# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..
npm run get-functions # extract TS functions
npm run split-data # split data into train/test/validation
npm run create-model-files # create train + dev files for UniXcoder finetuning
# finetune (see Using UniXcoder)
# predict test set (see Using UniXcoder)
npm run evaluate # runs metrics and reports them
```

## Extracting functions
`npm run get-functions`

Functions need to be extracted from the TypeScript repositories.
The output files contain the TS function including any leading JSDocs if present (the same data as CodeSearchNet).
The file name is always `[fileName].[functionName].[hash].ts`.

## Data splitting
`npm run split-data`

Data needs to be split into sets.
A train set, dev set and test set is created.
The sets are saved as `train.txt`, `dev.txt` and `test.txt` in the folder containing all functions.
Each line in one of those files references a function.
The split can be configured inside `config.json`.

## Creating model files
`npm run create-model-files`

UniXcoder needs some files to be finetuned: `train.txt`, `dev.json`.
These and `test.json` are generated for both JS and TS with _js and _ts suffixes respectively.


## Using UniXcoder
Finetuning:
```bash
# TS
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_ts.txt \
	--dev_filename ../data/UniXcoder/dev_ts.json \
  --output_dir saved_models/ts \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --train_batch_size 2 \
  --eval_batch_size 2 \
  --gradient_accumulation_steps 1 \
  --learning_rate 2e-5 \
  --num_train_epochs 10
  
# JS
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_js.txt \
	--dev_filename ../data/UniXcoder/dev_js.json \
  --output_dir saved_models/js \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --train_batch_size 2 \
  --eval_batch_size 2 \
  --gradient_accumulation_steps 1 \
  --learning_rate 2e-5 \
  --num_train_epochs 10
```

Testing:
```bash
# TS
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/ts/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_ts.json \
  --output_dir saved_models/ts \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
  
# JS
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/ts/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_js.json \
  --output_dir saved_models/js \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
```

## Evaluation
`npm run evaluate`

The test script generates a `predictions.txt` file with predictions made by the UniXcoder model for the test set.
Each line contains the prediction of the exact same line in the test file.
