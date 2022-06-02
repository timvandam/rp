import json
from typing import List, Literal
import torch
from torch.utils.data import TensorDataset, SequentialSampler, DataLoader
from transformers import RobertaTokenizer, RobertaModel, RobertaConfig
import torch.onnx
from pathlib import Path
from seq2seq import Seq2Seq
import os
from tqdm import tqdm

with open('./config.json') as f:
    config = json.loads(f.read())

MASKED_FOLDER = config["MASKED_FOLDER"]
PREDICTED_FOLDER = config["PREDICTED_FOLDER"]
BATCH_SIZE = 32
# FINETUNED_MODEL_PATH = "data/model/epoch-9.bin"
FINETUNED_MODEL_PATH = "/mnt/tdam/models/saved_models/ts/epoch-9.bin"
# FINETUNED_MODEL_PATH = None
LANGUAGE: Literal["js", "ts"] = "ts"


class Example:
    def __init__(self, input: str, truth: str, file: str):
        self.input = input
        self.truth = truth
        self.file = file


# read file paths from some file
# only reads the specified language
def read_examples(filename: str = str(Path(MASKED_FOLDER, 'files.txt'))) -> List[Example]:
    examples: List[Example] = []
    with open(filename, 'r') as file:
        lines = file.readlines()
        for line in tqdm(lines, desc="Loading examples"):
            masked_filename = line.strip()
            with open(str(Path(MASKED_FOLDER, masked_filename))) as masked_file:
                obj = json.loads(masked_file.read())
                examples.append(Example(obj[LANGUAGE]["input"], obj[LANGUAGE]["truth"], masked_filename))

    return examples


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
config = RobertaConfig.from_pretrained("microsoft/unixcoder-base")
config.is_decoder = True
tokenizer = RobertaTokenizer.from_pretrained("microsoft/unixcoder-base")
encoder = RobertaModel.from_pretrained("microsoft/unixcoder-base", config=config)
eos_ids = [tokenizer.convert_tokens_to_ids('Ġ;'), tokenizer.convert_tokens_to_ids('Ġ}'),
           tokenizer.convert_tokens_to_ids('Ġ{')]
eos_ids = [tokenizer.sep_token_id]

max_length = 936
model = Seq2Seq(encoder=encoder, decoder=encoder, config=config,
                beam_size=5, max_length=max_length,
                sos_id=tokenizer.cls_token_id, eos_id=eos_ids)

if FINETUNED_MODEL_PATH is not None:
    model.load_state_dict(torch.load(FINETUNED_MODEL_PATH))

model.to(device)
print("Model loaded")


def tokenize(source):
    source_tokens = [x for x in tokenizer.tokenize(source) if x != '\u0120']
    source_tokens = ["<s>", "<decoder-only>", "</s>"] + source_tokens[-(max_length - 3):]
    source_ids = tokenizer.convert_tokens_to_ids(source_tokens)
    source_ids = source_ids + [tokenizer.pad_token_id] * (max_length - len(source_ids))
    return source_tokens, source_ids


# takes a list of examples and returns their source ids
def convert_examples_to_all_source_ids(examples: List[Example]):
    return torch.tensor([tokenize(example.input)[1] for example in examples], dtype=torch.long)


def post_process(code: str):
    return code \
        .replace("<NUM_LIT>", "0") \
        .replace("<STR_LIT>", "")


examples = read_examples()
all_source_ids = convert_examples_to_all_source_ids(examples)
data = TensorDataset(all_source_ids)
sampler = SequentialSampler(data)
dataloader = DataLoader(data, sampler=sampler, batch_size=BATCH_SIZE)
model.eval()

Path(PREDICTED_FOLDER).mkdir(parents=True, exist_ok=True)
files = open(str(Path(PREDICTED_FOLDER, 'files.txt')), 'w+')

for batch in tqdm(dataloader, desc="Predicting", total=len(dataloader)):
    batch = tuple(t.to(device) for t in batch)
    source_ids = batch[0]
    with torch.no_grad():
        predictions = model(source_ids=source_ids)
        # TODO: Emit all predictions
        for prediction in predictions:
            example = examples.pop(0)
            t = list(prediction[0].cpu().numpy())
            if 0 in t:
                t = t[:t.index(0)]
            text = tokenizer.decode(t, clean_up_tokenization_spaces=False)
            if "{" in text:
                text = text[:text.index("{") + 1]
            if "</s>" in text:
                text = text[:text.index("</s>")]
            text = post_process(text)

            filepath = os.path.splitext(example.file)[0]
            write_filepath = f"{filepath}.{LANGUAGE}.json"
            path = Path(PREDICTED_FOLDER, write_filepath)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({
                "input": example.input,
                "truth": example.truth,
                "prediction": [text]
            }))
            files.write(write_filepath + "\n")

files.close()
