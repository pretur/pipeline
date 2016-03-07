import * as acorn from 'acorn';

const walk = require('acorn/dist/walk');

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

export function compileExpression(expression: string): (context: any) => void {
  const script = Function('"use strict";' + expression);
  return (context: any) => {

    let originalGlobal;
    let originalWindow;

    if (typeof global !== 'undefined') {
      originalGlobal = global;
      global = context;
    }

    if (typeof window !== 'undefined') {
      originalWindow = window;
      window = context;
    }

    script.call(null);

    if (global) {
      global = originalGlobal;
    }

    if (window) {
      window = originalWindow;
    }

  }
}
