import shutil

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, StoppingCriteriaList, StoppingCriteria
import json
import os
import sys
import time
from tqdm import tqdm

from joblib import Parallel, delayed
from typing import List, TextIO

# signals the start of a document
BOS = "<|endoftext|>"
# signals the end of a generated infill
EOM = "<|endofmask|>"
# signals the end of a file
EOF = "<|/ file |>"
# Until the end of the line
stop_tokens = [205, 284, 353, 536, 994, 3276, 4746, 15471, 16027, 28602, 40289, 43275, 50517]

model_name = "facebook/incoder-1B"
model = AutoModelForCausalLM.from_pretrained(model_name).half().cuda()
tokenizer = AutoTokenizer.from_pretrained(model_name)
model.eval()


def make_sentinel(i: int) -> str:
    # signals (1) a location to insert an infill and (2) the start of the infill generation
    return f"<|mask:{i}|>"


class StatementStoppingCriteria(StoppingCriteria):

    def __init__(self, init_length: int, stop_tokens: List[int]):
        self.init_length = init_length
        self.stop_tokens = stop_tokens

    def __contains_stop_token(self, tokens: List[int]):
        for token in tokens[1:]:
            if token in self.stop_tokens:
                return True
        return False

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        return self.__contains_stop_token(input_ids[0][self.init_length:])


def generate(left_context: str, right_context: str) -> str:
    prompt = left_context + make_sentinel(0) + right_context + EOF + make_sentinel(1) + make_sentinel(0)
    tokens = tokenizer(prompt, return_tensors="pt", truncation='only_first').to("cuda")
    token_count = len(tokens.input_ids[0])

    stopping_criteria = StoppingCriteriaList()
    stopping_criteria.append(StatementStoppingCriteria(token_count, stop_tokens))

    with torch.no_grad():
        completion = model.generate(
            **tokens,
            top_p=0.95,
            do_sample=True,
            temperature=0.2,
            max_length=token_count + 48,
            stopping_criteria=stopping_criteria
        )[0][token_count:]
    return tokenizer.decode(
        completion,
        clean_up_tokenization_spaces=False,
        skip_special_tokens=True
    ).strip().split("\n")[0]


def _process_data_batch(file: TextIO, output_path: str) -> None:
    total = 0
    empty = 0

    with open(output_path, mode='w') as f_out:
        lines = file.readlines()
        for line in tqdm(lines):
            obj = json.loads(line)
            left = obj["input"]
            prediction = generate(left, "")
            total += 1
            if prediction.strip() == "":
                empty += 1
            if total % 100 == 0:
                print(f"{empty} / {total} = {empty / total}")
            f_out.write(prediction + "\n")


def run(data_path: str, output_folder_path: str) -> None:
    if not data_path:
        print("No path to test file given")
        sys.exit(1)

    if not output_folder_path:
        print("Not output folder path given")
        sys.exit(1)

    # folder_path = f"/scratch/tovandam/output/{'-'.join(data_path.split('/')[-2:]).split('.')[0]}"
    os.makedirs(output_folder_path, exist_ok=True)
    output_path = f"{output_folder_path}/predictions.txt"
    print(f"Reading {data_path}. Output = {output_path}")

    with open(data_path, "r") as f:
        _process_data_batch(f, output_path)

    shutil.copyfile(data_path, f"{output_folder_path}/test.json")


if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2])
