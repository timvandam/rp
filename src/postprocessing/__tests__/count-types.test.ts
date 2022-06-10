import { countTypes } from '../count-types';

describe('countTypes', () => {
  it.each([
    {
      name: 'variable declarations 1',
      code: `
const x = 1
const y = 2  
  `,
      annotations: 0,
      potential: 2,
    },
    {
      name: 'variable declarations 2',
      code: `
const x = 1
const y: number = 2  
  `,
      annotations: 1,
      potential: 2,
    },
    {
      name: 'named function 1',
      code: `
function x() {
  return 1;
}
  `,
      annotations: 0,
      potential: 1,
    },
    {
      name: 'named function 2',
      code: `
function x(): number {
  return 1;
}
  `,
      annotations: 1,
      potential: 1,
    },
    {
      name: 'named function with params 1',
      code: `
function x(num) {
  return 1;
}
  `,
      annotations: 0,
      potential: 2,
    },
    {
      name: 'named function with params 2',
      code: `
function x(num: number): number {
  return 1;
}
  `,
      annotations: 2,
      potential: 2,
    },
    {
      name: 'named function with params 3',
      code: `
function x(num: number) {
  return 1;
}
  `,
      annotations: 1,
      potential: 2,
    },
  ])('$name', ({ name, annotations, potential, code }) => {
    console.log(name);
    expect(countTypes(code)).toEqual({ potential, annotations });
  });
});
