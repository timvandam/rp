#!/bin/bash
set -e

######################
# train-unixcoder.sh #
#####################################
# Sequentially fine-tunes UniXcoder #
#####################################

FOLDER="./sets"

while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--folder)
      FOLDER=$2
      shift
      shift
      ;;
    *)
      echo "Invalid argument '$1'"
      exit 1
  esac
done

TYPE=("normal" "explicit") # TS1K and TS1K-E
COMMENTS=("all" "single_line" "multi_line" "none")
LANGS=("js" "ts")

for t in "${TYPE[@]}"; do
  for c in "${COMMENTS[@]}"; do
    for l in "${LANGS[@]}"; do
      echo "Fine-tuning UniXcoder on Dataset '$t', Comments '$c', Language '$l'"

      UNIXCODER_FOLDER_NAME="UniXcoder-$t-$l-$c"
      SETS_FOLDER="$FOLDER/sets/$UNIXCODER_FOLDER_NAME"
      TRAIN_FILE_PATH="$SETS_FOLDER/train.txt"
      VALIDATION_FILE_PATH="$SETS_FOLDER/dev.json"
      OUTPUT_FOLDER_PATH="$FOLDER/models/$UNIXCODER_FOLDER_NAME"

      python py/run.py \
        --do_train \
        --do_eval \
        --model_name_or_path microsoft/unixcoder-base \
        --train_filename "$TRAIN_FILE_PATH" \
        --dev_filename "$VALIDATION_FILE_PATH" \
        --output_dir "$OUTPUT_FOLDER_PATH" \
        --max_source_length 936 \
        --max_target_length 64 \
        --beam_size 3 \
        --train_batch_size 2 \
        --eval_batch_size 2 \
        --gradient_accumulation_steps 1 \
        --learning_rate 2e-5 \
        --num_train_epochs 10
    done
  done
done