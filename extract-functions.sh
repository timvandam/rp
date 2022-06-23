#!/bin/bash
set -e

#####################
# extract-functions #
###############################
# Extract functions from zips #
###############################

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

DATASETS=("normal" "explicit")
mkdir -p "$FOLDER/functions"
for d in "${DATASETS[@]}"; do
  FUNCTIONS_ZIP_PATH="$FOLDER/functions-$d.zip"
  echo "Unzipping $FUNCTIONS_ZIP_PATH"
  unzip "$FUNCTIONS_ZIP_PATH" -d "$FOLDER/functions"
done

