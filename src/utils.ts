import vm from 'isomorphic-vm';
import * as esprima from 'esprima';

const walk = require('esprima-walk');

import contextify from './contextify';
export {contextify};

export function discoverDependencies(expression: string | ESTree.Program, validIdentifiers: string[]): string[] {
  const ast = typeof expression === 'string' ? esprima.parse(expression) : expression;

  const identifiers = [];

  walk(ast, node => {
    if (node &&
      node.type === 'Identifier' &&
      validIdentifiers.indexOf(node.name) !== -1 &&
      identifiers.indexOf(node.name) === -1) {
      identifiers.push(node.name);
    }
  });

  return identifiers;
}

export function executeExpression(expression: string, context: any): void {
  vm.runInNewContext(expression, context);
}
