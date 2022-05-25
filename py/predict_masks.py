import glob
from joblib import Parallel, delayed
import json
from typing import List
import torch
from torch import nn
from transformers import RobertaTokenizer, RobertaModel, RobertaConfig
import gc

from seq2seq import Seq2Seq
from unixcoder import UniXcoder
import os
from tqdm import tqdm


with open('./config.json') as f:
    config = json.loads(f.read())


MASKED_FOLDER = config["MASKED_FOLDER"]
PREDICTED_FOLDER = config["PREDICTED_FOLDER"]
MAX_WORKERS = 1  # int(config["ALLOWED_CPUS"] * os.cpu_count())




def predict_folder_files(folder_paths: List[str]):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # model = UniXcoder("microsoft/unixcoder-base")
    tokenizer = RobertaTokenizer.from_pretrained("microsoft/unixcoder-base")
    config =RobertaConfig.from_pretrained("microsoft/unixcoder-base")
    config.is_decoder = True

    # budild model
    encoder = RobertaModel.from_pretrained("microsoft/unixcoder-base", config=config)
    eos_ids = [tokenizer.convert_tokens_to_ids('Ġ;'), tokenizer.convert_tokens_to_ids('Ġ}'),
                   tokenizer.convert_tokens_to_ids('Ġ{')]

    model = Seq2Seq(encoder=encoder, decoder=encoder, config=config,
                    beam_size=5, max_length=936,
                    sos_id=tokenizer.cls_token_id, eos_id=eos_ids)
    model.load_state_dict(torch.load("/mnt/tdam/models/saved_models/ts/epoch-9.bin"))
    model.to(device)
    print("Model loaded")

    def tokenize(item):
        source, max_length, tokenizer = item
        source_tokens = [x for x in tokenizer.tokenize(source) if x != '\u0120']
        source_tokens = ["<s>", "<decoder-only>", "</s>"] + source_tokens[-(max_length - 3):]
        source_ids = tokenizer.convert_tokens_to_ids(source_tokens)
        padding_length = max_length - len(source_ids)
        source_ids += [tokenizer.pad_token_id] * padding_length
        return source_tokens, source_ids

    def predict_statement_mask(code: str) -> List[str]:
        print(torch.cuda.memory_summary(device=None, abbreviated=False))
        source = (code, 936 + 64, tokenizer)
        tokens_ids = tokenize(source)[1]
        source_ids = torch.tensor([tokens_ids]).to(device)
        torch.cuda.memory_summary(device=None, abbreviated=False)
        prediction_ids = model.forward(source_ids)
        torch.cuda.memory_summary(device=None, abbreviated=False)
        predictions = model.decode(prediction_ids)
        torch.cuda.memory_summary(device=None, abbreviated=False)
        del source_ids
        torch.cuda.empty_cache()
        gc.collect()
        return [x.replace("<mask0>", "").strip() for x in predictions[0]]

    for folder_path in folder_paths:
        print("Handling folder " + folder_path)
        for root, dirs, files in os.walk(folder_path):
            out_folder_path = root.replace(MASKED_FOLDER, PREDICTED_FOLDER)
            os.makedirs(out_folder_path, exist_ok=True)
            for file in files:
                out_file_name = ".".join(file.split(".")[:-2]) + ".predicted.json"
                out_path = out_folder_path + "/" + out_file_name

                if os.path.isfile(out_path):
                    continue

                with open(root + "/" + file, "r") as f_in:
                    txt = f_in.read()
                    data = json.loads(txt)
                data["tsPredictions"] = predict_statement_mask(data["tsMasked"])
                data["jsPredictions"] = predict_statement_mask(data["jsMasked"])
                with open(out_path, "w") as f_out:
                    f_out.write(json.dumps(data))


masked_folders = glob.glob(MASKED_FOLDER + "/*")

total_folders = len(masked_folders)
processed_folders = 0
print(f"Found {total_folders} folders")

print("Spawning at most " + str(MAX_WORKERS) + " threads")

batch_size = 3
batches = [masked_folders[i:i + batch_size] for i in range(0, len(masked_folders), batch_size)]

Parallel(n_jobs=MAX_WORKERS)(delayed(predict_folder_files)(batch) for batch in tqdm(batches))

print("Finished processing " + str(processed_folders) + " folders")
