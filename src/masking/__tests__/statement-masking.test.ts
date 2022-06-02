import { getFunctionBodyBounds, addMaskComments, removeComments } from '../statement-masking';
import tokenize, { Token } from 'js-tokens';

const findMultilineComment = (tokens: Token[], comment: string) => {
  const idx = tokens.findIndex(
    (token) => token.type === 'MultiLineComment' && token.value === `/*${comment}*/`,
  );

  if (idx === -1) {
    throw new Error(`Could not find comment block: ${comment}`);
  }

  return idx;
};

describe('getFunctionBodyBounds', () => {
  it.each([
    `function() /*start*/{
/*end*/}`,
    `function() /*start*/{
    /* {{{ */
/*end*/}`,
    `function() /*start*/{
    /** {{{ */
/*end*/}`,
    `function() /*start*/{
    const x = \`{{{\`
/*end*/}`,
    `function() /*start*/{
    const a = '123';
    const x = \`{\${a}{{\`
/*end*/}`,
    `function() /*start*/{
    const a = '123';
    const x = \`\${a}{{\`
/*end*/}`,
    `function() /*start*/{
    const a = '123';
    const x = \`\${a}{\${a}{\`
/*end*/}`,
    `function() /*start*/{
    const a = '123';
    const x = \`{{\${a}\`
/*end*/}`,
    `/* {{{}}}} */ function() /*start*/{
    const a = '123';
    const x = \`{{\${a}\`
/*end*/}`,
    `/* }}}}{{{ */ function() /*start*/{
    const a = '123';
    const x = \`{{\${a}\`
/*end*/}`,
  ])('should return indices of the starting and ending { } of a function', (code) => {
    const tokens = [...tokenize(code)];
    const startIndex = 1 + findMultilineComment(tokens, 'start');
    const endIndex = 1 + findMultilineComment(tokens, 'end');
    const result = getFunctionBodyBounds(tokens);
    expect(result).toEqual({ startIndex, endIndex });
  });
});

describe('removeComments', () => {
  it('single line comments', () => {
    expect(removeComments('lets go // 123')).toBe('lets go ');
  });

  it('multi line comments', () => {
    expect(removeComments('lets go /* 123 */ yea lets go')).toBe('lets go  yea lets go');
  });
});
