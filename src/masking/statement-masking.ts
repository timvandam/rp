import tokenize, {Token} from 'js-tokens';
import {clamp, findIndexRight, not, randChoice, randChoices, range} from '../utils';
import {LINE_MASK_CHANCE, RANDOM_SEED} from '../config';
import random from 'random-seed';
import {isComment} from "../preprocessing/preprocess";

const MASK_COMMENT = '/*<mask>*/';

export type ModifiedToken = Token | { type: 'PotentialType'; value: string };

/**
 * Adds a <mask> comment to some code to indicate that masking should happen there.
 * This should be applied to TypeScript code, such that it can be compiled to JS and then masked to get equivalent masked tokens.
 * @param code TypeScript code
 * @param hashString if you want to hash based on e.g. a filename
 */
export function addMaskComments(code: string, hashString: string = '') {
    const tokens = [...tokenize(code)];
    // groupTokens(tokens);
    const {startIndex, endIndex} = getFunctionBodyBounds(tokens);

    const lineRanges = getLineRanges(tokens, startIndex + 1, endIndex - 1);

    if (lineRanges.length === 0) {
        return code;
    }

    // Make sure to mask each identical function the same way
    const prng = random.create(`${hashString}-${RANDOM_SEED}`);
    const suitableLineRanges = lineRanges.filter(lineRange => lineRangeHasMaskableTokens(tokens, ...lineRange));
    for (const [from, to] of randChoices(
        suitableLineRanges,
        clamp(1, Math.min(5, suitableLineRanges.length), Math.floor(lineRanges.length * LINE_MASK_CHANCE)),
        prng.random.bind(prng),
    ).reverse()) {
        maskRange(
            tokens,
            from,
            to,
            prng.random.bind(prng)
        );
    }

    return tokens.map((v) => v.value).join('');
}

/**
 * Groups tokens where there are potentially types such that we don't mask types
 */
export function groupTokens(tokens: ModifiedToken[]) {
    for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];
        type LevelPunctuator = '{' | '<' | '[' | '('
        type OppositeLevelPunctuator = '}' | '>' | ']' | ')'
        const isLevelPunctuator = (value: string): value is LevelPunctuator => [...'{<[('].includes(value)
        const isOppositeLevelPunctuator = (value: string): value is OppositeLevelPunctuator => [...'}>])'].includes(value)
        const oppositeLevelPunctuator: Record<OppositeLevelPunctuator, LevelPunctuator> = {
            '}': '{',
            ']': '[',
            '>': '<',
            ')': '(',
        }
        let levels: Record<LevelPunctuator, number> = {
            '{': 0,
            '<': 0,
            '[': 0,
            '(': 0,
        }
        if (current.type === 'Punctuator' && current.value === ':') {
            const typeToken: ModifiedToken = { type: 'PotentialType', value: ':' }
            for (let j = i + 1; j < tokens.length; j++) {
                if (tokens[j].type === 'Punctuator') {
                    const value = tokens[j].value;
                    if (isLevelPunctuator(value)) {
                        levels[value]++;
                    } else if (isOppositeLevelPunctuator(value)) {
                        levels[oppositeLevelPunctuator[value]]--;
                    } else if ([...'=,);'].includes(value) && Object.values(levels).every(level => level === 0)) {
                        // Probably end of type
                        tokens.splice(i, j - i, typeToken)
                        break;
                    }
                } else {
                    typeToken.value += tokens[j].value;
                }
            }
        }
    }
}

function lineRangeHasMaskableTokens(tokens: ModifiedToken[], from: number, to: number): boolean {
    return range(from, to + 1).some(i => isMaskableToken(tokens[i]))
}

/**
 * Inserts a mask comment before a token in some range (e.g. a line)
 */
function maskRange(tokens: ModifiedToken[], from: number, to: number, random = Math.random): void {
    const maskableTokenIndices = range(from, to + 1).filter((i) => isMaskableToken(tokens[i]));
    if (maskableTokenIndices.length === 0) {
        throw new Error('No maskable tokens.')
    }
    const tokenToMask = randChoice(maskableTokenIndices, random);
    tokens.splice(tokenToMask, 0, {
        type: 'MultiLineComment',
        value: MASK_COMMENT,
        closed: true,
    });
}

/**
 * Gets the start and end indices of non-empty lines
 */
function getLineRanges(tokens: ModifiedToken[], from: number, to: number): [from: number, to: number][] {
    const lines: [from: number, to: number][] = [];

    const newLineIndices = range(from, to + 1).filter(
        (i) => tokens[i].type === 'LineTerminatorSequence',
    );

    let prevIdx = from;
    for (const idx of newLineIndices) {
        if (prevIdx >= idx) {
            prevIdx = Math.max(prevIdx, idx + 1);
            continue;
        }

        lines.push([prevIdx, idx - 1]);
        prevIdx = idx + 1;
    }

    return lines;
}

/**
 * Returns the indices of the start and end tokens of the function body ({ and }).
 */
export function getFunctionBodyBounds(tokens: ModifiedToken[]) {
    try {
        const endIndex = findIndexRight(
            tokens,
            (token) => token.type === 'Punctuator' && token.value === '}',
        );

        let indent = 0;
        const startIndex = findIndexRight(tokens, (token) => {
            if (token.type !== 'Punctuator') return false;
            if (token.value === '}') {
                indent++;
            } else if (token.value === '{') {
                indent--;
                return indent === 0;
            }
            return false;
        });

        return {startIndex, endIndex};
    } catch (e) {
        console.log(tokens.map(t => t.value).join(''))
        throw e
    }
}

export function isMaskableToken(token: ModifiedToken): boolean {
    switch (token.type) {
        case 'StringLiteral':
        case 'RegularExpressionLiteral':
        case 'IdentifierName':
        case 'NumericLiteral':
        case 'NoSubstitutionTemplate':
        case 'Punctuator':
        case 'PrivateIdentifier':
            return true;

        // Template is later replaced, so can not be masked
        case 'TemplateHead':
        case 'TemplateMiddle':
        case 'TemplateTail':
        // Comments are also removed later (sometimes) and are not under test
        case 'MultiLineComment':
        case 'SingleLineComment':
        case 'WhiteSpace':
        case 'LineTerminatorSequence':
        case 'Invalid':
        case 'PotentialType':
        default:
            return false;
    }
}

export function getMaskedVariants(code: string): { input: string; gt: string }[] {
    const parts = code.split(MASK_COMMENT);

    if (parts.length === 1) return [];

    const truths = parts
        .slice(1)
        .map((part) => part.match(/.+/)?.[0])
        .filter((truth): truth is string => truth !== undefined)
        .map((truth) => removeComments(truth).trim());

    if (truths.length !== parts.length - 1) {
        // throw new Error(
        //   'Can not find all truths. If this is JS some comments may have been removed during transpilation',
        // );
        return [];
    }

    return truths.map((gt, i) => ({ input: parts.slice(0, i + 1).join(''), gt }));
}

/**
 * Removes comments from some piece of code
 */
export function removeComments(code: string): string {
    return [...tokenize(code)]
        .filter((token) => token.type !== 'SingleLineComment' && token.type !== 'MultiLineComment')
        .map((token) => token.value)
        .join('');
}
