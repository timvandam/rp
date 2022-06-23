## Installation
Ensure you have NodeJS and Python 3 installed.
Then install dependencies:
```bash
pip install -r requirements.txt
npm install
```

## Reproduction
```bash
./extract-functions.sh # extract functions from their zip files
./create-sets.sh # split the data and create test/validation/train sets for UniXcoder/InCoder
./train-unixcoder.sh # train unixcoder on the train sets
./test-unixcoder.sh # let unixcoder predict on the test sets
./test-incoder.sh # let incoder predict on the test sets
./evaluate # post process predictions, evaluate metrics, perform statistical tests
```

	