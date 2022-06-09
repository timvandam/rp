#!/bin/sh
#SBATCH --job-name="unixcoder"
#SBATCH --partition=gpu
#SBATCH --time=15:00:00
#SBATCH --cpus-per-task=48
#SBATCH --nodes=1
#SBATCH --gres=gpu:2
#SBATCH --mem-per-cpu=1G
#SBATCH --ntasks-per-node=1

module load 2022r1
module load gpu
module load cuda/11.3
module load py-pip/21.1.2-zxgv7pz
module load python/3.8.12-bohr45d
python -m pip install --user -r requirements.txt
srun python py/run.py \
     	--do_train \
     	--do_eval \
     	--model_name_or_path microsoft/unixcoder-base \
     	--train_filename ./UniXcoder/train_ts.txt \
     	--dev_filename ./UniXcoder/dev_ts.json \
       --output_dir saved_models/ts-big \
       --max_source_length 936 \
       --max_target_length 64 \
       --beam_size 3 \
       --train_batch_size 32 \
       --eval_batch_size 32 \
       --gradient_accumulation_steps 1 \
       --learning_rate 2e-5 \
       --num_train_epochs 10

