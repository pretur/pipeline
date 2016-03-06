/// <reference path="../typings/main.d.ts" />

import * as Promise from 'bluebird';
import {expect} from 'chai';

import {Context} from '../src';

import {
is,
createConstant,
createCached,
createContextual,
createAccumulated,
AccumulatedParameter,
ConstantParameter,
ContextualParameter,
CachedParameter,
} from '../src/param';

describe('params', () => {

  describe('constant', () => {

    it('should create a constant param', () => {
      const param = createConstant('GROSS', 1000);
      expect(param.value).to.be.equals(1000);
    });

    it('should test against a constant param', () => {
      const param = createConstant('GROSS', 1000);
      expect(is.constant(param)).to.be.true;
    });

  });

  describe('cached', () => {

    it('should create a cached param', () => {
      const param = createCached('CUSTOEMR_CREDIT', () => Promise.resolve(1000));
      expect(param.hasValue).to.be.false;
      expect(param.value).to.be.null;
    });

    it('should test against a cached param', () => {
      const param = createCached('CUSTOEMR_CREDIT', () => Promise.resolve(1000));
      expect(is.cached(param)).to.be.true;
    });

    it('should resolve only once', () => {
      let resolved = 0;
      const param = createCached('CUSTOEMR_CREDIT', () => {
        resolved++;
        return Promise.resolve(1000);
      });

      param.resolve();
      param.resolve();
      param.resolve();

      expect(resolved).to.be.equals(1);
    });

    it('should resolve all extra calls too', () => {
      const param = createCached('CUSTOEMR_CREDIT', () => Promise.resolve(1000));

      const firstPromise = param.resolve();
      const secondPromise = param.resolve();
      const thirdPromise = param.resolve();

      expect(param.hasValue).to.be.false;

      expect(firstPromise).to.be.equals(secondPromise, 'first and second should be equal');
      expect(firstPromise).to.be.equals(thirdPromise, 'first and third should be equal');

      let first = 0;
      let second = 0;
      let third = 0;

      firstPromise.then((result) => first = result);
      secondPromise.then((result) => second = result);
      thirdPromise.then((result) => third = result);

      return param.resolve().then((result) => {
        expect(result).to.be.equals(1000);
        expect(first).to.be.equals(1000);
        expect(second).to.be.equals(1000);
        expect(third).to.be.equals(1000);
        expect(param.hasValue).to.be.true;
        expect(param.value).to.be.equals(1000);
      });
    });

    it('should resolve correctly', () => {
      const param = createCached('CUSTOEMR_CREDIT', () => Promise.resolve(1000));
      const promise = param.resolve();

      expect(param.hasValue).to.be.false;

      return promise.then(() => expect(param.hasValue).to.be.true && expect(param.value).to.be.equals(1000));
    });

  });

  describe('contextual', () => {

    it('should create a contextual param', () => {
      const param = createContextual('DISCOUNT', () => Promise.resolve(1000));
      param.resolve({}).then(result => expect(result).to.be.equals(1000));
    });

    it('should test against a cached param', () => {
      const param = createContextual('DISCOUNT', () => Promise.resolve(1000));
      expect(is.contextual(param)).to.be.true;
    });

    it('should retrieve value from constant param in context', () => {
      const param = createContextual('DISCOUNT', (context) => {
        const gross = context['GROSS'] as ConstantParameter;
        expect(is.constant(gross)).to.be.true;
        return Promise.resolve(gross.value);
      });

      return param.resolve({ 'GROSS': createConstant('GROSS', 1000) })
        .then((result) => expect(result).to.be.equals(1000));
    });

    it('should retrieve value from a cached param in context', () => {
      const param = createContextual('DISCOUNT', (context) => {
        const credit = context['CUSTOEMR_CREDIT'] as CachedParameter;
        expect(is.cached(credit)).to.be.true;
        return credit.resolve().then(result => result * 2);
      });

      return param.resolve({ 'CUSTOEMR_CREDIT': createCached('GROSS', () => Promise.resolve(100)) })
        .then((result) => expect(result).to.be.equals(200));
    });

    it('should retrieve value from a nested contexual param in context', () => {

      let cachedResolved = 0;

      const context: Context = {
        'CUSTOEMR_CREDIT': createCached('GROSS', () => {
          cachedResolved++;
          return Promise.resolve(100);
        }),
        'TAX': createContextual('GROSS', (context) => {
          const credit = context['CUSTOEMR_CREDIT'] as CachedParameter;
          expect(is.cached(credit)).to.be.true;
          return credit.resolve().then(result => result * 2);
        }),
      };

      const param = createContextual('DISCOUNT', (context) => {
        const tax = context['TAX'] as ContextualParameter;
        expect(is.contextual(tax)).to.be.true;

        const credit = context['CUSTOEMR_CREDIT'] as CachedParameter;
        expect(is.cached(credit)).to.be.true;

        return Promise.all([
          tax.resolve(context),
          credit.resolve(),
        ]).then(([tax, credit]) => tax * credit);
      });

      return param.resolve(context).then((result) => {
        expect(result).to.be.equals(20000);
        expect(cachedResolved).to.be.equals(1);
      });
    });

  });

  describe('accumulated', () => {

    it('should create an accumulated param', () => {
      const param = createAccumulated('NET', 1000);
      expect(param.value).to.be.equals(1000);
    });

    it('should test against an accumulated param', () => {
      const param = createAccumulated('NET', 1000);
      expect(is.accumulated(param)).to.be.true;
    });

    it('should correctly modify the param', () => {
      const param = createAccumulated('NET', 1000);
      param.set(1000 - 100);
      expect(param.value).to.be.equals(900);
      param.set(1000 + 100)
      expect(param.value).to.be.equals(1100);
      param.set(Math.floor(1000 / 3));
      expect(param.value).to.be.equals(333);
    });

  });

});
