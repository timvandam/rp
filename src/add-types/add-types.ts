import { Node, Project } from 'ts-morph';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export function addTypes(project: Project) {
  for (const sourceFile of project.getSourceFiles()) {
    sourceFile.forEachDescendant((node) => {
      try {
        //TODO: check if types can be inferenced. if not maybe warn or something
        if (Node.isVariableDeclaration(node) && node.getTypeNode() === undefined) {
          node.setType(node.getType().getBaseTypeOfLiteralType().getText(node));
        } else if (
          ((Node.isFunctionDeclaration(node) && node.isImplementation()) ||
            Node.isArrowFunction(node)) &&
          node.getReturnTypeNode() === undefined
        ) {
          node.getParameters().forEach((param) => {
            if (param.getTypeNode() === undefined) {
              param.setType(param.getType().getBaseTypeOfLiteralType().getText(node));
            }
          });

          node.setReturnType(node.getReturnType().getBaseTypeOfLiteralType().getText(node));
        }
      } catch (e: any) {}
    });
  }
}
