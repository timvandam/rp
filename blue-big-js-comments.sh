#!/bin/sh
#
#SBATCH --job-name="unixcoder big comments ts"
#SBATCH --partition=gpu
#SBATCH --time=23:59:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --gpus-per-task=2
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
     	--train_filename UniXcoder-big-comments/train_ts.txt \
     	--dev_filename UniXcoder-big-comments/dev_ts.json \
       --output_dir /scratch/tovandam/saved_models/ts-big-comments \
       --max_source_length 936 \
       --max_target_length 64 \
       --beam_size 3 \
       --train_batch_size 16 \
       --eval_batch_size 16 \
       --gradient_accumulation_steps 1 \
       --learning_rate 2e-5 \
       --num_train_epochs 10

python py/run.py \
	--do_test \
	--model_name_or_path microsoft/unixcoder-base \
	--load_model_path /scratch/tovandam/saved_models/ts-big-comments/checkpoint-best-acc/pytorch_model.bin \
	--test_filename UniXcoder-big-comments/test_ts.json \
  --output_dir /scratch/tovandam/saved_models/ts-big-comments \
  --max_source_length 936 \
  --max_target_length 64 \
  --beam_size 3 \
  --eval_batch_size 2