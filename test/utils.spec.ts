/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';
import * as acorn from 'acorn';

import {discoverDependencies, executeExpression, contextify} from '../src/utils';

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

  describe('executeExpression', () => {

    it('should scope execution', () => {
      const context = { a: false };
      executeExpression(`a = Array.isArray([])`, context);
      expect(context.a).to.be.true;
      expect((global as any).a).to.be.undefined;
    });

    it('should successfully modify context', () => {
      const context: any = { a: 1, b: 2 };
      executeExpression(`c = a + b`, context);
      expect(context.c).to.be.equals(3);
    });

    it('should fail to access dangerous globals', () => {
      const context: any = {};
      expect(() => executeExpression(`setTimeout(null);`, context)).throw();
      expect(() => executeExpression(`require('fs');`, context)).throw();
      expect(() => executeExpression(`alert('♥');`, context)).throw();
      expect(() => executeExpression(`new Buffer();`, context)).throw();
    });

  });

  describe('contextify', () => {

    it('should return the same object', () => {
      const sandbox = { a: false };
      const context = contextify(sandbox);
      expect(sandbox).to.be.equals(context);
    });

    it('should contain math methods and properties', () => {
      const context = contextify({});
      expect(context.pow).to.be.equals(Math.pow);
      expect(context.log).to.be.equals(Math.log);
      expect(context.max).to.be.equals(Math.max);
      expect(context.min).to.be.equals(Math.min);
      expect(context.E).to.be.equals(Math.E);
      expect(context.PI).to.be.equals(Math.PI);
    });

    it('should work within vm', () => {
      const context = contextify({ a: 0 });
      executeExpression(`a = round(floor(min(pow(3, 2), 2.5))* 3.6)`, context);
      expect(context.a).to.be.equals(7);
    });

  });

});
