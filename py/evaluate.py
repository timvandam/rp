import glob
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from io import BytesIO
import tokenize
from joblib import Parallel, delayed
import json
from typing import List
import torch
from unixcoder import UniXcoder
import os
import progressbar
from tqdm import tqdm
import math
import Levenshtein as Levenshtein
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from nltk.translate.meteor_score import meteor_score
import nltk
from rouge_score import rouge_scorer
from js_tokenize import tokenize
from blue import compute_bleu

with open('./config.json') as f:
    config = json.loads(f.read())

PREDICTED_FOLDER = config["PREDICTED_FOLDER"]
MAX_WORKERS = int(config["ALLOWED_CPUS"] * os.cpu_count())


def empty_evaluation_obj():
    return {
        "n": 0,
        "meteor": 0,
        "bleu": 0, # todo: make sure its bleu4
        "levenshtein": 0,
        "rouge": {
            "precision": 0,
            "recall": 0,
            "f1": 0,
        }
    }

def average_evaluation(evaluation):
    evaluation["meteor"] /= evaluation["n"]
    evaluation["bleu"] /= evaluation["n"]
    evaluation["levenshtein"] /= evaluation["n"]
    evaluation["rouge"]["precision"] /= evaluation["n"]
    evaluation["rouge"]["recall"] /= evaluation["n"]
    evaluation["rouge"]["f1"] /= evaluation["n"]


def update_evaluation(evaluation, meteor, bleu, levenshtein, rouge):
    evaluation["levenshtein"] += levenshtein
    evaluation["bleu"] += bleu
    evaluation["rouge"]["f1"] += rouge["f1"]
    evaluation["rouge"]["precision"] += rouge["precision"]
    evaluation["rouge"]["recall"] += rouge["recall"]
    evaluation["meteor"] += meteor
    evaluation["n"] += 1


def compute_rouge(line: str, completion: str):
    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    scores = scorer.score(line, completion)
    score = scores["rougeL"]

    return {
        "precision": score.precision,
        "recall": score.recall,
        "f1": score.fmeasure
    }

def tokenize_code(code):
    return [t.value for t in tokenize(code)]


def evaluate_folder(folder_path: str):
    evaluation_js = empty_evaluation_obj()
    evaluation_ts = empty_evaluation_obj()

    for root, dirs, files in os.walk(folder_path):
        for file in files:
            print("Opening file " + root + "/" + file)
            with open(root + "/" + file, "r") as f_in:
                txt = f_in.read()
                data = json.loads(txt)
            print("Read file " + root + "/" + file)


            js_predictions = data["jsPredictions"]
            js_truth = data["jsTruth"]
            print("Tokenizing js")
            # js_token_prediction = tokenize_code(js_predictions[0])
            # js_token_truth = tokenize_code(js_truth)

            update_evaluation(
                evaluation_js,
                1, #meteor_score(references=[js_token_truth], hypothesis=js_token_prediction),
                compute_bleu(js_truth, js_predictions[0])[0], #sentence_bleu([js_token_truth], js_token_prediction, smoothing_function=SmoothingFunction().method2),
                Levenshtein.ratio(js_truth, js_predictions[0]),
                {"f1":1,"precision":1,"recall":1}# compute_rouge(" ".join(js_token_truth), " ".join(js_token_prediction))
            )
                
            print(evaluation_js)

            ts_predictions = data["tsPredictions"]
            ts_truth = data["tsTruth"]
            print("Tokenizing ts")
            # ts_token_prediction = tokenize_code(js_predictions[0])
            # ts_token_truth = tokenize_code(js_truth)

            update_evaluation(
                evaluation_ts,
                1, #meteor_score(references=[ts_token_truth], hypothesis=ts_token_prediction),
                compute_bleu(ts_truth, ts_predictions[0])[0], #sentence_bleu([ts_token_truth], ts_token_prediction, smoothing_function=SmoothingFunction().method2),
                Levenshtein.ratio(ts_truth, ts_predictions[0]),
                {"f1":1,"precision":1,"recall":1}# compute_rouge(" ".join(ts_token_truth), " ".join(ts_token_prediction))
            )

    print("Averaging")
    average_evaluation(evaluation_js)
    average_evaluation(evaluation_ts)

    print(evaluation_js)
    print(evaluation_ts)
    return { "js": evaluation_js, "ts": evaluation_ts }


folders = glob.glob(PREDICTED_FOLDER + "/*")
print(f"Found {len(folders)} folders")

# result is a list of metrics. we should average them
# result = Parallel(n_jobs=MAX_WORKERS)(delayed(evaluate_folder)(folder) for folder in tqdm(folders))
print(evaluate_folder(folders[0]))
print("Done")

with open("./data/Evaluation_Py.json", "w") as f:
    f.write(json.dumps(result))

print("Finished processing " + str(len(folders)) + " folders")
