import sys
from typing import List

import pandas as pd
import os
import json
from autorank import autorank, latex_table, create_report
from scipy.stats import ttest_rel

folder = sys.argv[1]
models_folder = f"{folder}/models"
sets_folder = f"{folder}/sets"

metrics = ['exact_match', 'levenshtein', 'bleu', 'rouge', 'meteor']

use_autorank = False
use_scipy = True

aliases = {
    'UniXcoder-normal-js-all': 'TS1K UniXcoder JS',
    'UniXcoder-normal-ts-all': 'TS1K UniXcoder TS',
    'UniXcoder-normal-js-none': 'TS1K UniXcoder JS No Comments',
    'UniXcoder-normal-ts-none': 'TS1K UniXcoder TS No Comments',
    'UniXcoder-normal-js-single_line': 'TS1K UniXcoder JS Single-Line Comments',
    'UniXcoder-normal-ts-single_line': 'TS1K UniXcoder TS Single-Line Comments',
    'UniXcoder-normal-js-multi_line': 'TS1K UniXcoder JS Multi-Line Comments',
    'UniXcoder-normal-ts-multi_line': 'TS1K UniXcoder TS Multi-Line Comments',
    'UniXcoder-explicit-ts-all': 'TS1K-E UniXcoder TS',

    'InCoder-normal-js-all': 'TS1K InCoder JS',
    'InCoder-normal-ts-all': 'TS1K InCoder TS',
    'InCoder-normal-js-none': 'TS1K InCoder JS No Comments',
    'InCoder-normal-ts-none': 'TS1K InCoder TS No Comments',
    'InCoder-normal-js-single_line': 'TS1K InCoder JS Single-Line Comments',
    'InCoder-normal-ts-single_line': 'TS1K InCoder TS Single-Line Comments',
    'InCoder-normal-js-multi_line': 'TS1K InCoder JS Multi-Line Comments',
    'InCoder-normal-ts-multi_line': 'TS1K InCoder TS Multi-Line Comments',
    'InCoder-explicit-ts-all': 'TS1K-E InCoder TS',
}

comparisons = [
    ['UniXcoder-normal-js-all', 'UniXcoder-normal-ts-all'],
    ['UniXcoder-normal-ts-all', 'UniXcoder-explicit-ts-all'],
    ['UniXcoder-normal-js-none', 'UniXcoder-normal-js-single_line'],
    ['UniXcoder-normal-js-none', 'UniXcoder-normal-js-multi_line'],
    ['UniXcoder-normal-ts-none', 'UniXcoder-normal-ts-single_line'],
    ['UniXcoder-normal-ts-none', 'UniXcoder-normal-ts-multi_line'],

    ['InCoder-normal-js-all', 'InCoder-normal-ts-all'],
    ['InCoder-normal-ts-all', 'InCoder-explicit-ts-all'],
    ['InCoder-normal-js-none', 'InCoder-normal-js-single_line'],
    ['InCoder-normal-js-none', 'InCoder-normal-js-multi_line'],
    ['InCoder-normal-ts-none', 'InCoder-normal-ts-single_line'],
    ['InCoder-normal-ts-none', 'InCoder-normal-ts-multi_line'],
]

if __name__ == '__main__':
    for metric in metrics:
        print(f"--- {metric} ---")
        for populations in comparisons:
            data = []
            all_exist = True
            for population in populations:
                if not os.path.exists(os.path.join(models_folder, population)):
                    all_exist = False
                    break
            if not all_exist:
                continue
            for population in populations:
                cur_data = []
                data.append(cur_data)
                # one sample on each line of metrics.txt. line = { "empty": boolean, bleu: x, exact_match, y } etc
                with open(os.path.join(models_folder, population, 'metrics.txt')) as f:
                    for line in f:
                        obj = json.loads(line)
                        cur_data.append(obj)

            # only take the data that every population is non empty for
            data_zipped = [d for d in zip(*data) if all(map(lambda s: not s["empty"], d))]

            pop_names = list(map(lambda pop: aliases[pop] if pop in aliases else pop, populations))

            data_pop1 = list(map(lambda d: d[0][metric], data_zipped))
            data_pop2 = list(map(lambda d: d[1][metric], data_zipped))

            if use_scipy:
                result = ttest_rel(data_pop1, data_pop2)
                if result.pvalue <= 0.05 or True:
                    print(f"{' vs '.join(pop_names)}: p = {round(result.pvalue, 3):.3f}")

            if use_autorank:
                data_frame = pd.DataFrame({ pop_names[0]: data_pop1, pop_names[1]: data_pop2 })
                result = autorank(data_frame, alpha=0.05)
                if result.pvalue < 0.05:
                    # print(f"{' vs '.join(populations)}: p = {result.pvalue} {'!!!' if result.pvalue <= 0.05 else ''}")
                    latex_table(result, decimal_places=4)
                    print()
                    create_report(result, decimal_places=4)
                    print()
                    print()

