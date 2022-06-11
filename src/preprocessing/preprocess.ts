import tokenize, {Token} from 'js-tokens';
import {filter, not} from '../utils';
import {PreservedComments} from "../unixcoder/create-unixcoder-files";

export function preprocess(code: string, preservedComments: PreservedComments) {
  let tokens = tokenize(code);
  tokens = replaceTemplateStrings(tokens);

  if ((preservedComments & PreservedComments.MULTI_LINE) === 0) {
    tokens = filter(tokens, not(isMultiLineComment))
  }

  if ((preservedComments & PreservedComments.SINGLE_LINE) === 0) {
    tokens = filter(tokens, not(isSingleLineComment))
  }

  tokens = removeDoubleWhitespaces(tokens);

  return [...stringifyTokens(tokens)].join('').trim();
}

function* replaceTemplateStrings(tokens: Iterable<Token>): Iterable<Token> {
  let level = 0;
  for (const token of tokens) {
    if (token.type === 'TemplateHead') {
      level++;
    } else if (token.type === 'TemplateTail') {
      level--;
    }

    if (level === 0) {
      if (token.type === 'TemplateTail') {
        yield { type: 'NoSubstitutionTemplate', value: '``', closed: true };
      } else {
        yield token;
      }
    }
  }
}

function isComment(token: Token) {
  return token.type === 'MultiLineComment' || token.type === 'SingleLineComment';
}

function isSingleLineComment(token :Token): boolean {
  return token.type === 'SingleLineComment'
}

function isMultiLineComment(token :Token): boolean {
  return token.type === 'MultiLineComment'
}

function* stringifyTokens(tokens: Iterable<Token>) {
  for (const token of tokens) {
    if (token.type === 'StringLiteral' || token.type === 'NoSubstitutionTemplate') {
      const startQuote = token.value[0];
      const endQuote = token.value[token.value.length - 1];
      yield `${startQuote}<STR_LIT>${endQuote}`;
    } else if (token.type === 'MultiLineComment') {
      yield token.value.replace(/\n/g, '<EOL>');
    } else if (token.type === 'NumericLiteral') {
      yield '<NUM_LIT>';
    } else if (token.type === 'LineTerminatorSequence') {
      yield '<EOL>';
    } else if (
      token.type === 'TemplateHead' ||
      token.type === 'TemplateMiddle' ||
      token.type === 'TemplateTail'
    ) {
      throw new Error(
        'Can not stringify TemplateHead/TemplateMiddle/TemplateTail. These should first be removed by replaceTemplateStrings',
      );
    } else {
      yield token.value;
    }
  }
}

/**
 * Removing comments can introduce trailing whitespaces.
 * This function removes all duplicate+ whitespaces given that it is not directly following a newline.
 */
function* removeDoubleWhitespaces(tokens: Iterable<Token>): Iterable<Token> {
  let isNewLine = false;
  let prevIsWhiteSpace = false;
  for (const token of tokens) {
    isNewLine =
      token.type === 'LineTerminatorSequence' || (isNewLine && token.type === 'WhiteSpace');

    if (token.type === 'WhiteSpace' && prevIsWhiteSpace && !isNewLine) {
      continue;
    }

    yield token;
    prevIsWhiteSpace = token.type === 'WhiteSpace';
  }
}
