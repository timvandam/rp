#!/bin/bash
set -e

###################
# test-incoder.sh #
##############################
# Sequentially tests InCoder #
##############################

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
      echo "Testing InCoder on Dataset '$t', Comments '$c', Language '$l'"

      INCODER_FOLDER_NAME="InCoder-$t-$l-$c"
      SETS_FOLDER="$FOLDER/sets/$INCODER_FOLDER_NAME"
      TEST_FILE_PATH="$SETS_FOLDER/test.json"
      OUTPUT_FOLDER_PATH="$FOLDER/models/$UNIXCODER_FOLDER_NAME"

      python py/incoder.py "$TEST_FILE_PATH" "$OUTPUT_FOLDER_PATH"
    done
  done
done
