# rp

## Fetching, preprocessing, masking, predicting, and evaluating
This will take a while
```bash
git clone git@github.com:timvandam/rp.git

# ↓ this clones ~50gb of typescript repos ↓ 
cd data && chmod +x ./cloner.sh && ./cloner.sh && cd ..

# extract TS functions without any transformations (if you want to add explicit types, run the 2 commands below)
npm run get-functions

# install npm dependencies (with yarn) and get functions with explicit types (eg `const x = 1` is converted to `const x: number = 1`)
npm run install-deps
npm run get-functions-explicit 

# dedupe, as there might be multiple tsconfig's within the same project
# only required if you used get-functions-explicit
sort -u -o ./data/Functions/files.txt ./data/Functions/files_dedup.txt

npm run split-data # split data into train/test/validation
npm run create-model-files [-- --preserve-comments] # create train + dev files for UniXcoder finetuning
# finetune (see Using UniXcoder)
# predict test set (see Using UniXcoder)

npm run postprocess # post process the ground truth and the prediction, preparing them for evaluation

npm run evaluate # runs metrics and reports them
```

## Extracting functions
`npm run get-functions`
or
`npm run get-functions-explicit`

Functions need to be extracted from the TypeScript repositories.
The output files contain the TS function including any leading JSDocs if present (the same data as CodeSearchNet).
The file name is always `[fileName].[functionName].[hash].ts`.
The difference between `get-functions` and `functions-explicit` is that `get-functions-explicit` adds type annotations if they are explicit (e.g. `const x = 1` becomes `const x: number = `).
Note that adding these annotations can take a long time as it relies on the TypeScript compiler.

## Data splitting
`npm run split-data`

A train set, dev set and test set are created.
The sets are saved as `train.txt`, `dev.txt` and `test.txt` in the folder containing all functions.
Each line in one of those files references a function.
The split can be configured inside `config.json`.

## Creating model files
`npm run create-model-files`

UniXcoder needs some files to be finetuned: `train.txt` and `dev.json`.
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
  
# TS Extra
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_ts.txt \
	--dev_filename ../data/UniXcoder/dev_ts.json \
  --output_dir saved_models/ts_extra \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --train_batch_size 2 \
  --eval_batch_size 2 \
  --gradient_accumulation_steps 1 \
  --learning_rate 2e-5 \
  --num_train_epochs 10

# TS Comments
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_ts.txt \
	--dev_filename ../data/UniXcoder/dev_ts.json \
  --output_dir saved_models/ts-comments \
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
  
# JS Extra
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_js.txt \
	--dev_filename ../data/UniXcoder/dev_js.json \
  --output_dir saved_models/js_extra \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --train_batch_size 2 \
  --eval_batch_size 2 \
  --gradient_accumulation_steps 1 \
  --learning_rate 2e-5 \
  --num_train_epochs 10
  
# JS Comments
python ~/ts-vs-js/py/run.py \
	--do_train \
	--do_eval \
	--model_name_or_path microsoft/unixcoder-base \
	--train_filename ../data/UniXcoder/train_js.txt \
	--dev_filename ../data/UniXcoder/dev_js.json \
  --output_dir saved_models/js-comments \
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
  
# TS Extra
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/ts_extra/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_ts.json \
  --output_dir saved_models/ts_extra \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
  
# JS
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/js/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_js.json \
  --output_dir saved_models/js \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
  
# JS Extra
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/js_extra/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_js.json \
  --output_dir saved_models/js_extra \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
  
# JS Comments
python ~/ts-vs-js/py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path saved_models/js-comments/checkpoint-best-acc/pytorch_model.bin \
	--test_filename ../data/UniXcoder/test_js.json \
  --output_dir saved_models/js-comments \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2
```

## Evaluation
`npm run evaluate`

This script evaluates predictions and outputs metrics.
