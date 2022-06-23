#!/bin/bash
set -e

##################
# create-sets.sh #
########################################################
# Split data and create sets for UniXcoder and InCoder #
########################################################

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

# Split data
npm run split-data -- "$FOLDER" "normal"
npm run split-data -- "$FOLDER" "explicit"

# UniXcoder
npm run create-model-files -- --folder="$FOLDER" --name="UniXcoder" --data="normal"
npm run create-model-files -- --folder="$FOLDER" --name="UniXcoder" --data="explicit"

# InCoder
npm run create-model-files -- --folder="$FOLDER" --name="InCoder" --data="normal" --open="" --close="" --replaceLiterals=0
npm run create-model-files -- --folder="$FOLDER" --name="InCoder" --data="explicit" --open="" --close="" --replaceLiterals=0
