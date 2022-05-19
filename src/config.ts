import os from 'os'

export const REPOS_FOLDER = './data/Repos'
export const PREPROCESSED_FOLDER = './data/Preprocessed'
export const MASKED_FOLDER = './data/Masked'
export const PREDICTED_FOLDER = './data/Predicted'
export const ALLOWED_CPUS = Math.floor(os.cpus().length * 0.7)
