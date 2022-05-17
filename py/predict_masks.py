import json
from typing import List

import torch
from unixcoder import UniXcoder
import os

MASKED_FOLDER = './data/Masked'
PREDICTED_FOLDER = './data/Predicted'

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = UniXcoder("microsoft/unixcoder-base")
model.to(device)


def predict_statement_mask(code: str) -> List[str]:
    tokens_ids = model.tokenize([code],max_length=512,mode="<encoder-decoder>")
    source_ids = torch.tensor(tokens_ids).to(device)
    prediction_ids = model.generate(source_ids, decoder_only=False, beam_size=3, max_length=128)
    predictions = model.decode(prediction_ids)
    return [x.replace("<mask0>", "").strip() for x in predictions[0]]


# TODO: Speed up
for root, dirs, files in os.walk(MASKED_FOLDER):
    out_folder_path = root.replace(MASKED_FOLDER, PREDICTED_FOLDER)
    os.makedirs(out_folder_path, exist_ok=True)
    for file in files:
        out_file_name = ".".join(file.split(".")[:-2]) + ".predicted.json"
        with open(root + "/" + file, "r") as f_in:
            txt = f_in.read()
            data = json.loads(txt)
        data["tsPredictions"] = predict_statement_mask(data["tsMasked"])
        data["jsPredictions"] = predict_statement_mask(data["jsMasked"])
        with open(out_folder_path + "/" + out_file_name, "w") as f_out:
            f_out.write(json.dumps(data))
        print(root, "--------", file)