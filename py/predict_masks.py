import glob
from joblib import Parallel, delayed
import json
from typing import List
import torch
from unixcoder import UniXcoder
import os
from tqdm import tqdm


with open('./config.json') as f:
    config = json.loads(f.read())


MASKED_FOLDER = config["MASKED_FOLDER"]
PREDICTED_FOLDER = config["PREDICTED_FOLDER"]
MAX_WORKERS = int(config["ALLOWED_CPUS"] * os.cpu_count())


def predict_folder_files(folder_paths: List[str]):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = UniXcoder("microsoft/unixcoder-base")
    model.to(device)


    def predict_statement_mask(code: str) -> List[str]:
        tokens_ids = model.tokenize([code], max_length=512, mode="<encoder-decoder>")
        source_ids = torch.tensor(tokens_ids).to(device)
        prediction_ids = model.generate(source_ids, decoder_only=False, beam_size=3, max_length=128)
        predictions = model.decode(prediction_ids)
        del source_ids
        torch.cuda.empty_cache()
        return [x.replace("<mask0>", "").strip() for x in predictions[0]]

    for folder_path in folder_paths:
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
