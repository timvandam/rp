#!/bin/bash
set -e

###############
# evaluate.sh #
############################
# Evaluate all predictions #
############################

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

npm run postprocess -- "$FOLDER"
python py/evaluate.py "$FOLDER"
python py/statistical-analysis.py "$FOLDER"
