import os from 'os';
import { readFileSync } from 'fs';
import path from 'path';

const config: Record<string, any> = JSON.parse(
  readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'),
);

export const REPOS_FOLDER: string = config.REPOS_FOLDER;
export const PREPROCESSED_FOLDER: string = config.PREPROCESSED_FOLDER;
export const MASKED_FOLDER: string = config.MASKED_FOLDER;
export const PREDICTED_FOLDER: string = config.PREDICTED_FOLDER;
export const ALLOWED_CPUS: number = Math.floor(os.cpus().length * config.ALLOWED_CPUS);
export const TRAIN_FILE: string = config.TRAIN_FILE;
export const LINE_MASK_CHANCE: number = config.LINE_MASK_CHANCE;
