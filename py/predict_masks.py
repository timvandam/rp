import glob
from joblib import Parallel, delayed
import json
from typing import List
import torch
from torch import nn
from torch.utils.data import TensorDataset, SequentialSampler, DataLoader
from transformers import RobertaTokenizer, RobertaModel, RobertaConfig
import gc
import torch.onnx

from seq2seq import Seq2Seq
from unixcoder import UniXcoder
import os
from tqdm import tqdm


with open('./config.json') as f:
    config = json.loads(f.read())


MASKED_FOLDER = config["MASKED_FOLDER"]
PREDICTED_FOLDER = config["PREDICTED_FOLDER"]
MAX_WORKERS = 1  # int(config["ALLOWED_CPUS"] * os.cpu_count())

# def tokenize(item):
#     source, max_length, tokenizer = item
#     source_tokens = [x for x in tokenizer.tokenize(source) if x!='\u0120']
#     source_tokens = ["<s>","<decoder-only>","</s>"]+source_tokens[-(max_length-3):]
#     source_ids =  tokenizer.convert_tokens_to_ids(source_tokens)
#     padding_length = max_length - len(source_ids)
#     source_ids += [tokenizer.pad_token_id]*padding_length
#     return source_tokens,source_ids

# Examples format: [{ "source": "code", "groundTruth": "truth" }]
# def convert_examples_to_source_ids(examples, tokenizer, args,):
#     sources = [(x.source, 936, tokenizer) for x in examples]
#     tokenize_tokens = [tokenize(x) for x in sources]
#     return torch.tensor([sids for eidx, (st, sids) in tokenize_tokens], dtype=torch.long)


def predict_folder_files(folder_paths: List[str]):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    config = RobertaConfig.from_pretrained("microsoft/unixcoder-base")
    config.is_decoder = True
    tokenizer = RobertaTokenizer.from_pretrained("microsoft/unixcoder-base")
    encoder = RobertaModel.from_pretrained("microsoft/unixcoder-base", config=config)
    eos_ids = [tokenizer.convert_tokens_to_ids('Ġ;'), tokenizer.convert_tokens_to_ids('Ġ}'),
                   tokenizer.convert_tokens_to_ids('Ġ{')]


    max_length = 936
    model = Seq2Seq(encoder=encoder, decoder=encoder, config=config,
                    beam_size=5, max_length=max_length,
                    sos_id=tokenizer.cls_token_id, eos_id=eos_ids)
    model.load_state_dict(torch.load("/mnt/tdam/models/saved_models/ts/epoch-9.bin"))
    model.to(device)
    print("Model loaded")
    def tokenize(source):
        source_tokens = [x for x in tokenizer.tokenize(source) if x != '\u0120']
        source_tokens = ["<s>", "<decoder-only>", "</s>"] + source_tokens[-(max_length - 3):]
        source_ids = tokenizer.convert_tokens_to_ids(source_tokens)
        padding_length = max_length - len(source_ids)
        source_ids += [tokenizer.pad_token_id] * padding_length
        return source_tokens, source_ids

    # TODO: Batching if this is slow
    def predict_statement_mask(source: str) -> List[str]:
        tokens_ids = tokenize(source)[1]
        all_source_ids = torch.tensor([tokens_ids], dtype=torch.long).to(device)
        model.eval()
        predictions = []
        source_ids =all_source_ids
        with torch.no_grad():
            preds = model(source_ids=source_ids)
            for pred in preds:
                t=pred[0].cpu().numpy()
                t=list(t)
                if 0 in t:
                    t=t[:t.index(0)]
                text = tokenizer.decode(t)
                if "{" in text:
                    text = text[:text.index("{")]
                predictions.append(text)
            print("Predictions: ", predictions)
        del source_ids
        torch.cuda.empty_cache()
        gc.collect()
        return predictions

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
                print("prediction",data)
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
