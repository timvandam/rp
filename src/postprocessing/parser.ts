import { Token } from 'js-tokens';

const DEBUG = true;
const log = (...args: Parameters<typeof console.log>) => (DEBUG ? console.log(...args) : void 0);

function tokensAreEqual(a: Token | undefined, b: Token): boolean {
  if (a === undefined) return false;
  return a.type === b.type && a.value === b.value;
}

function readUntil(tokens: Token[], ...until: Token[]) {
  const result: Token[] = [];

  for (const token of tokens) {
    if (until.some((untilToken) => tokensAreEqual(token, untilToken))) {
      break;
    }

    result.push(token);
  }

  return result;
}

export type FunctionDeclaration = {
  name?: string;
  parameters: { name: string; type?: string }[];
  returnType?: string;
  body: string;
};

export function parseFunction(tokens: Token[]): FunctionDeclaration | null {
  tokens = [...tokens];

  const skipWhitespaces = () => {
    while (tokens.length > 0 && ['WhiteSpace', 'LineTerminatorSequence'].includes(tokens[0].type)) {
      tokens.shift();
    }
  };

  skipWhitespaces();

  if (tokens[0].type !== 'IdentifierName' || tokens[0].value !== 'function') {
    log('No `function` keyword');
    return null;
  }
  tokens.shift();
  skipWhitespaces();

  const hasName = tokens[0].type === 'IdentifierName';
  let name: string | undefined = undefined;
  if (hasName) {
    name = tokens[0].value;
    tokens.shift();
    skipWhitespaces();
  }

  if (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: '(' })) {
    log('No opening (');
    return null;
  }
  tokens.shift();
  skipWhitespaces();

  const parameters: FunctionDeclaration['parameters'] = [];
  while (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: ')' })) {
    skipWhitespaces();

    if (tokens[0].type !== 'IdentifierName') {
      log('No parameter name');
      return null;
    }

    const paramName = tokens[0].value;
    tokens.shift();
    skipWhitespaces();

    let paramType: string | undefined;

    if (tokensAreEqual(tokens[0], { type: 'Punctuator', value: ':' })) {
      tokens.shift();
      skipWhitespaces();

      const typeTokens = readUntil(
        tokens,
        { type: 'Punctuator', value: ',' },
        { type: 'Punctuator', value: ')' },
      );

      paramType = typeTokens.map((token) => token.value).join(' ');
      tokens.splice(0, typeTokens.length);
      skipWhitespaces();
    }

    parameters.push({
      name: paramName,
      type: paramType,
    });

    if (tokensAreEqual(tokens[0], { type: 'Punctuator', value: ',' })) {
      tokens.shift();
    }
  }
  tokens.shift();
  skipWhitespaces();

  let returnType: string | undefined;
  if (tokensAreEqual(tokens[0], { type: 'Punctuator', value: ':' })) {
    tokens.shift();
    skipWhitespaces();

    //TODO: make a readType that reads a full type instead of doing this. here it gets confused with {{}}
    //TODO:stop at whitespace
    const typeTokens = readUntil(tokens, { type: 'Punctuator', value: '{' });

    returnType = typeTokens.map((token) => token.value).join(' ');
    tokens.splice(0, typeTokens.length);
    skipWhitespaces();
  }

  const bodyTokens: Token[] = [];
  if (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: '{' })) {
    log(tokens);
    log('No body');
    return null;
  }
  tokens.shift();

  let level = 1;
  while (tokens.length > 0 && level > 0) {
    if (tokensAreEqual(tokens[0], { type: 'Punctuator', value: '}' })) {
      level--;
    } else if (tokensAreEqual(tokens[0], { type: 'Punctuator', value: '{' })) {
      level++;
    }

    bodyTokens.push(tokens[0]);
    tokens.shift();
  }

  if (level !== 0) {
    log('Unclosed function');
    return null;
  }

  const body = bodyTokens
    .slice(0, -1)
    .map((token) => token.value)
    .join('');

  return {
    name,
    body,
    returnType,
    parameters,
  };
}
