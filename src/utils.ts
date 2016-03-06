import * as acorn from 'acorn';

const walk = require('acorn/dist/walk');

export function discoverDependencies(expression: string, validIdentifiers: string[]): string[] {
  const ast = acorn.parse(expression);

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
