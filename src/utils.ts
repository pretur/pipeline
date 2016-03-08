import * as acorn from 'acorn';
import vm from 'isomorphic-vm';

const walk = require('acorn/dist/walk');

import contextify from './contextify';
export {contextify};

export function discoverDependencies(expression: string | ESTree.Program, validIdentifiers: string[]): string[] {
  const ast = typeof expression === 'string' ? acorn.parse(expression) : expression;

  const identifiers = [];

  walk.simple(ast, {
    'Identifier': (node) => {
      if (node.name && validIdentifiers.indexOf(node.name) !== -1 && identifiers.indexOf(node.name) === -1) {
        identifiers.push(node.name);
      }
    },
  });

  return identifiers;
}

export function executeExpression(expression: string, context: any): void {
  vm.runInNewContext(expression, context);
}
