/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';

import {discoverDependencies, getAvailableStepIds} from '../src/utils';

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

  });

  describe('getAvailableStepIds', () => {

    it('should return no ids for step 1', () => {
      expect(getAvailableStepIds(1)).to.be.deep.equal([]);
    });

    it('should return correct ids for step 5', () => {
      expect(getAvailableStepIds(5)).to.be.deep.equal(['STEP_1', 'STEP_2', 'STEP_3', 'STEP_4']);
    });

  });
});
