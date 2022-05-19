import glob
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from joblib import Parallel, delayed
import json
from typing import List
import torch
from unixcoder import UniXcoder
import os
import progressbar
from tqdm import tqdm
import math

MASKED_FOLDER = './data/Masked'
PREDICTED_FOLDER = './data/Predicted'

print("CUDA Available: " + str(torch.cuda.is_available()))


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

max_workers = 3
print("Spawning at most " + str(max_workers) + " threads")

batch_size = 3
batches = [masked_folders[i:i + batch_size] for i in range(0, len(masked_folders), batch_size)]

# with ThreadPoolExecutor(max_workers=max_workers) as executor, progressbar.ProgressBar(maxval=total_folders) as bar:
#     print("Starting processes")
#     executors = [executor.submit(predict_folder_files, batch) for batch in batches]

#     for result in as_completed(executors):
#         processed_folders += 1
#         # bar.update(processed_folders)

Parallel(n_jobs=max_workers)(delayed(predict_folder_files)(batch) for batch in tqdm(batches))

print("Finished processing " + str(processed_folders) + " folders")
