import glob
from pathlib import Path
import json
import Levenshtein as Levenshtein
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from nltk.translate.meteor_score import meteor_score
from rouge_score import rouge_scorer


def empty_evaluation_obj():
    return {
        "n": 0,
        "meteor": 0,
        "bleu": 0,  # todo: make sure its bleu4
        "levenshtein": 0,
        "rouge": {
            "precision": 0,
            "recall": 0,
            "f1": 0,
        },
        "exact_match": 0
    }


def average_evaluation(evaluation):
    evaluation["meteor"] /= evaluation["n"]
    evaluation["bleu"] /= evaluation["n"]
    evaluation["levenshtein"] /= evaluation["n"]
    evaluation["rouge"]["precision"] /= evaluation["n"]
    evaluation["rouge"]["recall"] /= evaluation["n"]
    evaluation["rouge"]["f1"] /= evaluation["n"]
    evaluation["exact_match"] /= evaluation["n"]


def update_evaluation(evaluation, meteor, bleu, levenshtein, rouge, exact_match):
    evaluation["levenshtein"] += levenshtein
    evaluation["bleu"] += bleu
    evaluation["rouge"]["f1"] += rouge["f1"]
    evaluation["rouge"]["precision"] += rouge["precision"]
    evaluation["rouge"]["recall"] += rouge["recall"]
    evaluation["meteor"] += meteor
    evaluation["exact_match"] += exact_match
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




def evaluate_folder(path: Path):
    result = empty_evaluation_obj()
    postprocessed_file = path / 'postprocessed.txt'

    with postprocessed_file.open() as f:
        for line in f.readlines():
            obj = json.loads(line)
            gt, gt_tokens, prediction, prediction_tokens = obj["gt"], obj["gtTokens"], obj["prediction"], obj["predictionTokens"]
            update_evaluation(result,
                              bleu=sentence_bleu([gt_tokens], prediction_tokens,
                                                 smoothing_function=SmoothingFunction().method2),
                              levenshtein=Levenshtein.ratio(gt, prediction),
                              meteor=meteor_score(references=[gt_tokens], hypothesis=prediction_tokens),
                              rouge=compute_rouge(gt, prediction),
                              exact_match=1 if gt.split() == prediction.split() else 0
                              )

    average_evaluation(result)
    return result


with open('./config.json') as f:
    config = json.loads(f.read())

RESULTS_FOLDER = config["RESULTS_FOLDER"]

folders = glob.glob(RESULTS_FOLDER + "/*")
print(f"Found {len(folders)} folders: {', '.join(folders)}")

for folder in folders:
    print("Evaluating folder " + folder)
    folder_path = Path(folder)
    result = evaluate_folder(folder_path)
    print(json.dumps(result, indent=2))

