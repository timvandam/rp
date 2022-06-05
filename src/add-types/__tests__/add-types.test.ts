import { ModuleKind, Project, Node } from 'ts-morph';
import { addTypes } from '../add-types';
import path from 'path';

it('simple project', () => {
  const project = new Project({
    compilerOptions: {
      module: ModuleKind.CommonJS,
      rootDir: './',
    },
    useInMemoryFileSystem: true,
  });

  project.createSourceFile(
    './a.ts',
    `
export function a() {
 return 1;
}
`.trim(),
  );

  project.createSourceFile(
    './b.ts',
    `
import { a } from './a';

export function b() {
    return a() + 1;
}
  `.trim(),
  );

  addTypes(project);

  //  TODO:Fix
  expect(
    project
      .getSourceFile('a.ts')
      ?.print()
      ?.trim()
      ?.split(/[\s\n\r]+/)
      ?.join(' '),
  ).toBe('export function a(): number { return 1; }');

  expect(
    project
      .getSourceFile('b.ts')
      ?.print()
      ?.trim()
      ?.split(/[\s\n\r]+/)
      ?.join(' '),
  ).toBe("import { a } from './a'; export function b(): number { return a() + 1; }");
});

it('lambda parameters', () => {
  const project = new Project();
  const sf = project.createSourceFile(
    'temp.ts',
    `
const x: (a: number) => number = (a) => a + 1;
`.trim(),
  );

  addTypes(project);

  expect(sf.getVariableDeclaration('x')?.getType()?.getText()).toBe('(a: number) => number');
});
