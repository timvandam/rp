#!/bin/bash
set -e

#####################
# test-unixcoder.sh #
################################
# Sequentially tests UniXcoder #
################################

FOLDER="./data"

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
      echo "Testing UniXcoder on Dataset '$t', Comments '$c', Language '$l'"

      UNIXCODER_FOLDER_NAME="UniXcoder-$t-$l-$c"
      SETS_FOLDER="$FOLDER/sets/$UNIXCODER_FOLDER_NAME"
      TEST_FILE_PATH="$SETS_FOLDER/test.json"
      OUTPUT_FOLDER_PATH="$FOLDER/models/$UNIXCODER_FOLDER_NAME"
      MODEL_PATH="$OUTPUT_FOLDER_PATH/checkpoint-best-acc/pytorch_model.bin"

      if [ ! -f "$MODEL_PATH" ]
      then
          echo "The model does not exist at '$MODEL_PATH'. Make sure to train the model before testing"
          exit 1
      fi

      python py/run.py \
        --do_test \
        --model_name_or_path microsoft/unixcoder-base \
        --load_model_path "$MODEL_PATH" \
        --test_filename "$TEST_FILE_PATH" \
        --output_dir "$OUTPUT_FOLDER_PATH" \
        --max_source_length 936 \
        --max_target_length 64 \
        --beam_size 3 \
        --eval_batch_size 2
    done
  done
done
