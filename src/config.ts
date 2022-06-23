import os from 'os';
import { readFileSync } from 'fs';
import path from 'path';

const config: Record<string, any> = JSON.parse(
  readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'),
);

export const ALLOWED_CPUS: number = Math.floor(os.cpus().length * config.ALLOWED_CPUS);
export const LINE_MASK_CHANCE: number = config.LINE_MASK_CHANCE;
export const RANDOM_SEED: string = config.RANDOM_SEED;

export const DATASET_SPLIT: {
  TRAIN: number;
  TEST: number;
  DEV: number;
} = config.DATASET_SPLIT;

if (DATASET_SPLIT.TRAIN + DATASET_SPLIT.TEST + DATASET_SPLIT.DEV !== 1.0) {
  throw new Error('Dataset split must total to 1');
}
