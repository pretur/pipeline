/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';
import * as acorn from 'acorn';

import {discoverDependencies, compileExpression} from '../src/utils';

describe('utils', () => {

  describe('discoverDependencies', () => {

    it('should discover simple dependencies', () => {
      const validIds = ['GROSS', 'NET', 'STEP_1'];
      const expression = `result = (STEP_1 + GROSS - NET) / NET * STEP_1`;

      const deps = discoverDependencies(expression, validIds);

      expect(deps).to.be.deep.equal(['STEP_1', 'GROSS', 'NET']);
    });

    it('should discover dependencies in code block', () => {
      const validIds = ['GROSS', 'NET', 'CREDIT', 'STEP_1'];
      const expression = `
        var grossAndNet = GROSS + pow(NET - GROSS, STEP_1);
        var minusCredit = grossAndNet - CREDIT;
        result = minusCredit - STEP_1 * NET; `;

      const deps = discoverDependencies(expression, validIds);

      expect(deps).to.be.deep.equal(['GROSS', 'NET', 'STEP_1', 'CREDIT']);
    });

    it('should discover dependencies from a syntax tree', () => {
      const validIds = ['GROSS', 'NET', 'STEP_1'];
      const expression = `result = (STEP_1 + GROSS - NET) / NET * STEP_1`;

      const deps = discoverDependencies(acorn.parse(expression), validIds);

      expect(deps).to.be.deep.equal(['STEP_1', 'GROSS', 'NET']);
    });

  });

  describe('compileExpression', () => {

    it('should scope execution', () => {
      const context = { a: true };
      const compiled = compileExpression(`a = Array.isArray([])`);
      compiled(context);
      expect(context.a).to.be.equals(true);
    });

  });

});
