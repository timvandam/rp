import tokenize, { Token } from 'js-tokens';
import { findIndexRight, randChoice, randChoices, range } from '../utils';
import { LINE_MASK_CHANCE } from '../config';

const MASK_COMMENT = '/*<mask>*/';

/**
 * Adds a <mask> comment to some code to indicate that masking should happen there.
 * This should be applied to TypeScript code, such that it can be compiled to JS and then masked to get equivalent masked tokens.
 * @param code TypeScript code
 */
export function addMaskComments(code: string) {
  //TODO: Do not mask types
  const tokens = [...tokenize(code)];
  const { startIndex, endIndex } = getFunctionBodyBounds(tokens);

  const lineRanges = getLineRanges(tokens, startIndex + 1, endIndex - 1);

  if (lineRanges.length === 0) {
    throw new Error('No lines');
  }

  for (const [from, to] of randChoices(
    lineRanges,
    Math.max(1, Math.floor(lineRanges.length * LINE_MASK_CHANCE)),
  ).reverse()) {
    maskRange(tokens, from, to);
  }

  return tokens.map((v) => v.value).join('');
}

/**
 * Inserts a mask comment before a token in some range (e.g. a line)
 */
function maskRange(tokens: Token[], from: number, to: number): void {
  const maskableTokenIndices = range(from, to + 1).filter((i) => isMaskableToken(tokens[i]));
  if (maskableTokenIndices.length === 0) {
    // console.log(
    //   `No maskable tokens in range of tokens ${tokens
    //     .slice(from, to + 1)
    //     .map((token) => token.value)
    //     .join('')}`,
    // );
    return;
  }
  const tokenToMask = randChoice(maskableTokenIndices);
  tokens.splice(tokenToMask, 0, {
    type: 'MultiLineComment',
    value: MASK_COMMENT,
    closed: true,
  });
}

/**
 * Gets the start and end indices of non-empty lines
 */
function getLineRanges(tokens: Token[], from: number, to: number): [from: number, to: number][] {
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
export function getFunctionBodyBounds(tokens: Token[]) {
  const endIndex = findIndexRight(
    tokens,
    (token: Token) => token.type === 'Punctuator' && token.value === '}',
  );

  let indent = 0;
  const startIndex = findIndexRight(tokens, (token: Token) => {
    if (token.type !== 'Punctuator') return false;
    if (token.value === '}') {
      indent++;
    } else if (token.value === '{') {
      indent--;
      return indent === 0;
    }
    return false;
  });

  return { startIndex, endIndex };
}

function isMaskableToken(token: Token): boolean {
  switch (token.type) {
    case 'StringLiteral':
    case 'TemplateMiddle':
    case 'RegularExpressionLiteral':
    case 'IdentifierName':
    case 'NumericLiteral':
      return true;

    case 'TemplateHead':
    case 'NoSubstitutionTemplate':
    case 'TemplateTail':
    case 'MultiLineComment':
    case 'SingleLineComment':
    case 'PrivateIdentifier':
    case 'Punctuator':
    case 'WhiteSpace':
    case 'LineTerminatorSequence':
    case 'Invalid':
    default:
      return false;
  }
}

export function getMaskedVariants(code: string): { input: string; truth: string }[] {
  const parts = code.split(MASK_COMMENT);
  const truths = parts
    .slice(1)
    .map((part) => part.match(/.+/)?.[0])
    .filter((truth): truth is string => truth !== undefined)
    .map((truth) => removeComments(truth).trim());

  if (truths.length !== parts.length - 1) {
    throw new Error(
      'Can not find all truths. If this is JS some comments may have been removed during transpilation',
    );
  }

  return truths.map((truth, i) => ({ input: parts.slice(0, i + 1).join(''), truth }));
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
