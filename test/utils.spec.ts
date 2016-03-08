/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';
import * as esprima from 'esprima';

import {discoverDependencies, executeExpression, contextify} from '../src/utils';

describe('utils', () => {

  describe('discoverDependencies', () => {

    it('should discover simple dependencies', () => {
      const validIds = ['GROSS', 'NET', 'STEP_1', 'RESULT'];
      const expression = `RESULT = (STEP_1 + GROSS - NET) / NET * STEP_1`;

      const deps = discoverDependencies(expression, validIds);

      expect(deps.sort()).to.be.deep.equal(['RESULT', 'STEP_1', 'GROSS', 'NET'].sort());
    });

    it('should discover dependencies in code block', () => {
      const validIds = ['RESULT', 'GROSS', 'NET', 'CREDIT', 'STEP_1'];
      const expression = `
        var grossAndNet = GROSS + pow(NET - GROSS, STEP_1);
        var minusCredit = grossAndNet - CREDIT;
        RESULT = minusCredit - STEP_1 * NET; `;

      const deps = discoverDependencies(expression, validIds);

      expect(deps.sort()).to.be.deep.equal(['RESULT', 'GROSS', 'NET', 'STEP_1', 'CREDIT'].sort());
    });

    it('should discover dependencies from a syntax tree', () => {
      const validIds = ['RESULT', 'GROSS', 'NET', 'STEP_1'];
      const expression = `RESULT = (STEP_1 + GROSS - NET) / NET * STEP_1`;

      const deps = discoverDependencies(esprima.parse(expression), validIds);

      expect(deps.sort()).to.be.deep.equal(['RESULT', 'STEP_1', 'GROSS', 'NET'].sort());
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
