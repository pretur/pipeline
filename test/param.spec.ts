/// <reference path="../typings/main.d.ts" />

import * as Promise from 'bluebird';
import {expect} from 'chai';

import {Context} from '../src/pipeline';

import {
  is, as,
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
      const param = createConstant(1000);
      expect(param.value).to.be.equals(1000);
    });

    it('should test against a constant param', () => {
      const param = createConstant(1000);
      expect(is.constant(param)).to.be.true;
    });

    it('should work with other types', () => {
      const param1 = createConstant('a');
      expect(param1.value).to.be.equals('a');

      const param2 = createConstant(true);
      expect(param2.value).to.be.equals(true);
    });

  });

  describe('cached', () => {

    it('should create a cached param', () => {
      const param = createCached(() => Promise.resolve(1000));
      expect(param.hasValue).to.be.false;
      expect(param.value).to.be.null;
    });

    it('should test against a cached param', () => {
      const param = createCached(() => Promise.resolve(1000));
      expect(is.cached(param)).to.be.true;
    });

    it('should resolve only once', () => {
      let resolved = 0;
      const param = createCached(() => {
        resolved++;
        return Promise.resolve(1000);
      });

      param.resolve();
      param.resolve();
      param.resolve();

      expect(resolved).to.be.equals(1);
    });

    it('should resolve all extra calls too', () => {
      const param = createCached(() => Promise.resolve(1000));

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
      const param = createCached(() => Promise.resolve(1000));
      const promise = param.resolve();

      expect(param.hasValue).to.be.false;

      return promise.then(() => expect(param.hasValue).to.be.true && expect(param.value).to.be.equals(1000));
    });

  });

  describe('contextual', () => {

    it('should create a contextual param', () => {
      const param = createContextual(() => Promise.resolve(1000));
      param.resolve({}, 1).then(result => expect(result).to.be.equals(1000));
    });

    it('should test against a cached param', () => {
      const param = createContextual(() => Promise.resolve(1000));
      expect(is.contextual(param)).to.be.true;
    });

    it('should retrieve value from constant param in context', () => {
      const param = createContextual((context, step) => {
        const gross = as.constant<number>(context['GROSS']);
        expect(is.constant(gross)).to.be.true;
        expect(step).to.be.equals(1);
        return Promise.resolve(gross.value);
      });

      return param.resolve({ 'GROSS': createConstant(1000) }, 1)
        .then((result) => expect(result).to.be.equals(1000));
    });

    it('should retrieve value from a cached param in context', () => {
      const param = createContextual((context) => {
        const credit = as.cached<number>(context['CUSTOMER_CREDIT']);
        expect(is.cached(credit)).to.be.true;
        return credit.resolve().then(result => result * 2);
      });

      return param.resolve({ 'CUSTOMER_CREDIT': createCached(() => Promise.resolve(100)) }, 1)
        .then((result) => expect(result).to.be.equals(200));
    });

    it('should retrieve value from a nested contexual param in context', () => {

      let cachedResolved = 0;

      const context: Context = {
        'CUSTOMER_CREDIT': createCached(() => {
          cachedResolved++;
          return Promise.resolve(100);
        }),
        'TAX': createContextual((context) => {
          const credit = as.cached<number>(context['CUSTOMER_CREDIT']);
          expect(is.cached(credit)).to.be.true;
          return credit.resolve().then(result => result * 2);
        }),
      };

      const param = createContextual((context) => {
        const tax = as.contextual<number>(context['TAX']);
        expect(is.contextual(tax)).to.be.true;

        const credit = as.cached<number>(context['CUSTOMER_CREDIT']);
        expect(is.cached(credit)).to.be.true;

        return Promise.all([
          tax.resolve(context, 1),
          credit.resolve(),
        ]).then(([tax, credit]) => tax * credit);
      });

      return param.resolve(context, 1).then((result) => {
        expect(result).to.be.equals(20000);
        expect(cachedResolved).to.be.equals(1);
      });
    });

  });

  describe('accumulated', () => {

    it('should create an accumulated param', () => {
      const param = createAccumulated(1000, () => Promise.resolve(1));
      expect(param.value).to.be.equals(1000);
    });

    it('should test against an accumulated param', () => {
      const param = createAccumulated(1000, () => Promise.resolve(1));
      expect(is.accumulated(param)).to.be.true;
    });

    it('should correctly modify the param with its default behavior', () => {
      const param = createAccumulated(1000);
      return param.modify(null, 10).then((result) => expect(param.value).to.be.equals(result).to.be.equals(10));
    });

    it('should behave the same with modifier applied and with when not', () => {
      const param1 = createAccumulated(1000);
      const param2 = createAccumulated(2000, (p, c, s) => Promise.resolve(s));

      const promise1 = param1.modify(null, 10);
      const promise2 = param2.modify(null, 20);

      expect(param1.value).to.be.equals(1000);
      expect(param2.value).to.be.equals(2000);

      promise1.then(result => expect(param1.value).to.be.equals(result).to.be.equals(10));
      promise2.then(result => expect(param2.value).to.be.equals(result).to.be.equals(20));

      return Promise.all([promise1, promise2]);
    });

    it('should correctly modify the param with custom modifier', () => {
      const param = createAccumulated(1000,
        (param, context) => Promise.resolve(param.initial + as.constant<number>(context['GROSS']).value));

      return param.modify({ GROSS: createConstant(10) }, null)
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1010));
    });

    it('should correctly accumulate the value with custom modifier', () => {
      const param = createAccumulated(1000,
        (param, context) => Promise.resolve(param.value + as.constant<number>(context['GROSS']).value));

      const context: Context = { GROSS: createConstant(10) };

      return param.modify(context, null)
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1010))
        .then(() => param.modify(context, null))
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1020));
    });

    it('should correctly accumulate the value based on step with custom modifier', () => {
      const param = createAccumulated(1000, (param, context, stepResult) => {
        return Promise.resolve(
          (param.value + as.constant<number>(context['STEP_GROSS']).value) + stepResult
        );
      });

      const context: Context = { STEP_GROSS: createConstant(10) };

      return param.modify(context, 100)
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1110))
        .then(() => param.modify(context, 150))
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1270))
        .then(() => param.modify(context, -200))
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1080));
    });

    it('should correctly accumulate the value with complex dependencies with custom modifier', () => {

      const context: Context = {
        STEP_GROSS: createConstant(10),
        CUSTOMER_CREDIT: createCached(() => Promise.resolve(1000)),
      };

      const param = createAccumulated(1000, (param, context, stepResult) => {
        const gross = (context['STEP_GROSS'] as ConstantParameter<number>).value;
        const creditPromise = (context['CUSTOMER_CREDIT'] as CachedParameter<number>).resolve();

        return creditPromise.then(credit => Promise.resolve(param.value + gross - (credit / 1000) + stepResult));
      });

      return param.modify(context, 100)
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1109))
        .then(() => param.modify(context, 150))
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1268))
        .then(() => param.modify(context, -200))
        .then(result => expect(param.value).to.be.equals(result).to.be.equals(1077));
    });

  });

});
