import { FunctionDeclaration, parseFunction } from '../parser';
import tokenize from 'js-tokens';

/*
describe('parseFunction', () => {
  it.each<{ name: string; code: string; result: FunctionDeclaration | null }>([
    {
      name: 'named function 1',
      code: `
function x() {
  return 1;
}
  `,
      result: {
        name: 'x',
        parameters: [],
        body: '\n  return 1;\n',
      },
    },
    {
      name: 'named function 2',
      code: `
function x(a: number) {
  return 1;
}
  `,
      result: {
        name: 'x',
        parameters: [{ name: 'a', type: 'number' }],
        body: '\n  return 1;\n',
      },
    },
    {
      name: 'function 1',
      code: `
function(a: number): number {
  return 1;
}
  `,
      result: {
        parameters: [{ name: 'a', type: 'number' }],
        returnType: 'number',
        body: '\n  return 1;\n',
      },
    },
  ])('$name', ({ code, result }) => {
    expect(parseFunction([...tokenize(code)])).toEqual(result);
  });
});
*/
