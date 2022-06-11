import { Token } from 'js-tokens';

const DEBUG = true;
const log = (...args: Parameters<typeof console.log>) => (DEBUG ? console.log(...args) : void 0);

export type Expression = FunctionDeclaration | VariableDeclaration | Block | string;

type Block = Expression[];

type VariableDeclaration = {
  name: string;
  type?: Expression;
  kind: 'var' | 'let' | 'const';
  value?: Expression;
};

function skipWhitespaces(tokens: Token[]): void {
  while (tokens[0].type === 'WhiteSpace') {
    tokens.shift();
  }
}

function readTokenOfType(tokens: Token[], type: Token['type']): Token | null {
  const token = tokens[0];

  if (token.type === type) {
    tokens.shift();
    return token;
  }

  return null;
}

function nextTokenIs(tokens: Token[], token: Token): boolean {
  return tokens[0].type === token.type && tokens[0].value === token.value;
}

function nextTokenHasType(tokens: Token[], type: Token['type']): boolean {
  return tokens[0].type === type;
}

function consumeNextTokenIfExists(tokens: Token[], token: Token): boolean {
  if (nextTokenIs(tokens, token)) {
    tokens.shift();
    return true;
  }
  return false;
}

export function parseStatement(tokens: Token[]): Expression {
  skipWhitespaces(tokens);

  const result: Token[] = [];

  while (
    !nextTokenIs(tokens, { type: 'Punctuator', value: ';' }) &&
    !nextTokenHasType(tokens, 'LineTerminatorSequence')
  ) {
    result.push(tokens[0]);
    tokens.shift();
  }

  return result.map((token) => token.value).join('');
}

export function parseType(tokens: Token[]): Expression {
  skipWhitespaces(tokens);

  //  TODO
  return '';
}

//todo: const x = 1, y = 2;
export function parseVariableDeclaration(tokens: Token[]): VariableDeclaration | null {
  skipWhitespaces(tokens);
  const kind = readTokenOfType(tokens, 'IdentifierName')?.value;

  if (kind === undefined || !(kind === 'var' || kind === 'let' || kind === 'const')) {
    return null;
  }

  const name = readTokenOfType(tokens, 'IdentifierName')?.value;

  if (name === undefined) {
    return null;
  }

  skipWhitespaces(tokens);
  let type: Expression | undefined;
  if (consumeNextTokenIfExists(tokens, { type: 'Punctuator', value: ':' })) {
    // parse type
    type = parseType(tokens);
  }

  skipWhitespaces(tokens);
  let value: Expression | undefined;
  if (consumeNextTokenIfExists(tokens, { type: 'Punctuator', value: '=' })) {
    // parse value
    value = parseStatement(tokens);
  }

  return {
    name,
    kind,
    type,
    value,
  };
}

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
  body: Block;
};

//TODO: support partial function
export function parseFunction(tokens: Token[]): FunctionDeclaration {
  tokens = [...tokens];
  const result: FunctionDeclaration = {
    name: undefined,
    parameters: [],
    returnType: undefined,
    body: [],
  };

  const skipWhitespaces = () => {
    while (tokens.length > 0 && ['WhiteSpace', 'LineTerminatorSequence'].includes(tokens[0].type)) {
      tokens.shift();
    }
  };

  skipWhitespaces();

  if (tokens[0].type !== 'IdentifierName' || tokens[0].value !== 'function') {
    log('No `function` keyword');
    return result;
  }
  tokens.shift();
  skipWhitespaces();

  const hasName = tokens[0].type === 'IdentifierName';
  if (hasName) {
    result.name = tokens[0].value;
    tokens.shift();
    skipWhitespaces();
  }

  if (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: '(' })) {
    log('No opening (');
    return result;
  }
  tokens.shift();
  skipWhitespaces();

  const parameters: FunctionDeclaration['parameters'] = [];
  while (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: ')' })) {
    skipWhitespaces();

    if (tokens[0].type !== 'IdentifierName') {
      log('No parameter name');
      return result;
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

  //TODO: Parse
  const bodyTokens: Token[] = [];
  if (!tokensAreEqual(tokens[0], { type: 'Punctuator', value: '{' })) {
    log(tokens);
    log('No body');
    return result;
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
    return result;
  }

  return result;
}
