#!/bin/sh
#
#SBATCH --job-name="unixcoder big js"
#SBATCH --partition=gpu
#SBATCH --time=23:59:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --gpus-per-task=1
#SBATCH --mem-per-cpu=12G

module load 2022r2
module load gpu
module load cuda/11.3
module load python/3.8.12
module load py-pip
python -m pip install --user -r requirements.txt
python py/run.py \
     	--do_train \
     	--do_eval \
     	--model_name_or_path microsoft/unixcoder-base \
     	--train_filename UniXcoder-big/train_js.txt \
     	--dev_filename UniXcoder-big/dev_js.json \
       --output_dir /scratch/tovandam/saved_models/js-big-2 \
       --max_source_length 936 \
       --max_target_length 64 \
       --beam_size 3 \
       --train_batch_size 2 \
       --eval_batch_size 2 \
       --gradient_accumulation_steps 1 \
       --learning_rate 2e-5 \
       --num_train_epochs 10

python py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path /scratch/tovandam/saved_models/js-big-2/checkpoint-best-acc/pytorch_model.bin \
	--test_filename UniXcoder-big/test_js.json \
  --output_dir /scratch/tovandam/saved_models/js-big-2 \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2