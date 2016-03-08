/// <reference path="../typings/main.d.ts" />

import * as Promise from 'bluebird';
import {expect} from 'chai';

import {
  as,
  createConstant,
  createCached,
  createAccumulated,
  createContextual,
} from '../src/param';

import {Context, Pipeline, resolveDependencies, updateContext} from '../src/pipeline';

describe('pipeline', () => {

  describe('resolveDependencies', () => {

    it('should resolve static dependencies', () => {
      const context: Context = {
        NET: createConstant(1000),
        GROSS: createAccumulated(200),
      };

      return resolveDependencies(context, ['NET', 'GROSS'], 1).then(resolvedContext => {
        expect(resolvedContext.NET).to.be.equals(1000);
        expect(resolvedContext.GROSS).to.be.equals(200);
      });
    });

    it('should resolve contexual dependencies', () => {
      const context: Context = {
        NET: createConstant(1000),
        GROSS: createAccumulated(200),
        TOTAL: createContextual((context: Context) => {
          const net = as.constant<number>(context['NET']).value;
          const gross = as.accumulated<number>(context['GROSS']).value;
          return Promise.resolve(net + gross);
        }),
      };

      return resolveDependencies(context, ['NET', 'GROSS', 'TOTAL'], 1).then(resolvedContext => {
        expect(resolvedContext.NET).to.be.equals(1000);
        expect(resolvedContext.GROSS).to.be.equals(200);
        expect(resolvedContext.TOTAL).to.be.equals(1200);
      });
    });

    it('should resolve indirectly cached dependencies', () => {
      const context: Context = {
        NET: createConstant(1000),
        GROSS: createAccumulated(200),
        CUSTOMER_CREDIT: createCached(() => Promise.resolve(2500)),
        TOTAL: createContextual((context: Context) => {
          const net = as.constant<number>(context['NET']).value;
          const gross = as.accumulated<number>(context['GROSS']).value;
          const credit = as.cached<number>(context['CUSTOMER_CREDIT']);

          if (credit.hasValue) {
            return Promise.resolve(credit.value + net + gross);
          }

          return credit.resolve().then(credit => credit + net + gross);
        }),
      };

      return resolveDependencies(context, ['NET', 'GROSS', 'TOTAL'], 1).then(resolvedContext => {
        expect(resolvedContext.NET).to.be.equals(1000);
        expect(resolvedContext.GROSS).to.be.equals(200);
        expect(resolvedContext.TOTAL).to.be.equals(3700);
      });
    });

    it('should resolve directly cached dependencies', () => {
      const context: Context = {
        CUSTOMER_CREDIT: createCached(() => Promise.resolve(2500)),
        PRODUCT_AVAILABLE: createCached(() => Promise.resolve(true)),
        USER_TYPE: createCached(() => Promise.resolve('salesman')),
      };

      return resolveDependencies(context, Object.keys(context), 1).then(resolvedContext => {
        expect(resolvedContext.CUSTOMER_CREDIT).to.be.equals(2500);
        expect(resolvedContext.PRODUCT_AVAILABLE).to.be.equals(true);
        expect(resolvedContext.USER_TYPE).to.be.equals('salesman');
      });
    });

    it('should resolve step dependent contexual', () => {
      const context: Context = {
        GROSS: createContextual((context, step) => Promise.resolve(2500 * step)),
      };

      return resolveDependencies(context, Object.keys(context), 2).then(resolvedContext => {
        expect(resolvedContext.GROSS).to.be.equals(5000);
      });
    });

  });

  describe('updateContext', () => {

    it('should leave others untouched', () => {
      const context: Context = {
        NET: createConstant(1000),
        GROSS: createContextual(() => Promise.resolve(100)),
        CUSTOMER_CREDIT: createCached(() => Promise.resolve(100)),
      };

      return updateContext(context, {}, ['NET', 'GROSS', 'CUSTOMER_CREDIT'], 1).then(() => {
        expect(as.constant<number>(context['NET']).value).to.be.equals(1000);
        expect(typeof as.contextual<number>(context['GROSS']).resolve).to.be.equals('function');
        expect(as.cached<number>(context['CUSTOMER_CREDIT']).hasValue).to.be.false;
      });
    });

    it('should update context with accumulated params', () => {
      const context: Context = {
        GROSS: createAccumulated(1),
      };

      return updateContext(context, { GROSS: 2 }, ['NET', 'GROSS'], 1).then(() => {
        expect(as.accumulated<number>(context['GROSS']).value).to.be.equals(2);
      });
    });

    it('should update context with accumulated params with custom modifier', () => {
      const context: Context = {
        GROSS: createAccumulated(1, (param, context, step, stepResult) => Promise.resolve(step * stepResult)),
      };

      return updateContext(context, { GROSS: 2 }, ['NET', 'GROSS'], 5).then(() => {
        expect(as.accumulated<number>(context['GROSS']).value).to.be.equals(10);
      });
    });

    it('should update context with multiple accumulated params', () => {
      const context: Context = {
        NET: createAccumulated(100),
        GROSS: createAccumulated(1, (param, context, step, stepResult) => Promise.resolve(step * stepResult)),
      };

      return updateContext(context, { GROSS: 2, NET: 200, OTHER: 1000 }, ['NET', 'GROSS'], 5).then(() => {
        expect(as.accumulated<number>(context['NET']).value).to.be.equals(200);
        expect(as.accumulated<number>(context['GROSS']).value).to.be.equals(10);
      });
    });

    it('should update ignore accumulated params that are not dependencies', () => {
      const context: Context = {
        NET: createAccumulated(100),
        NET2: createAccumulated(300),
      };

      return updateContext(context, { NET: 200, NET2: 1000 }, ['NET', 'GROSS'], 5).then(() => {
        expect(as.accumulated<number>(context['NET']).value).to.be.equals(200);
        expect(as.accumulated<number>(context['NET2']).value).to.be.equals(300);
      });
    });

  });

  it('should not fail with zero steps', () => {
    const pipeline = new Pipeline();
    return pipeline.execute({});
  });

  it('should work with single step no context', () => {
    const pipeline = new Pipeline();
    pipeline.addStep('var a = 1+1;');
    return pipeline.execute({});
  });

  it('should work with single step with context', () => {
    const pipeline = new Pipeline();
    const context: Context = {
      RESULT: createAccumulated(10),
      NET: createConstant(100),
    };
    pipeline.addStep('RESULT = NET * 2');
    return pipeline.execute(context).then(() => {
      expect(as.accumulated(context['RESULT']).initial).to.be.equals(10);
      expect(as.accumulated(context['RESULT']).value).to.be.equals(200);
      expect(as.constant(context['NET']).value).to.be.equals(100);
    });
  });

  it('should work with complex step with context', () => {
    const pipeline = new Pipeline();
    const context: Context = {
      RESULT: createAccumulated(0),
      NET: createConstant(100),
      CUSTOMER_CREDIT: createContextual(() => Promise.resolve(100)),
      PRODUCT_AVAILABLE: createCached(() => Promise.resolve(true)),
    };

    pipeline.addStep(`RESULT = NET + (PRODUCT_AVAILABLE ? CUSTOMER_CREDIT : 1)`);

    return pipeline.execute(context).then(() => {
      expect(as.accumulated(context['RESULT']).value).to.be.equals(200);
    });
  });

  it('should work multiple simple steps with context', () => {
    const pipeline = new Pipeline();
    const context: Context = {
      RESULT: createAccumulated(0),
      NET: createConstant(100),
      CUSTOMER_CREDIT: createContextual((context, step) => Promise.resolve(100 * step)),
    };

    pipeline.addStep(`RESULT += NET`);
    pipeline.addStep(`RESULT += 100`);
    pipeline.addStep(`RESULT += CUSTOMER_CREDIT`);

    return pipeline.execute(context).then(() => {
      expect(as.accumulated(context['RESULT']).value).to.be.equals(400);
    });
  });

  it('should work multiple complex steps with context', () => {
    const pipeline = new Pipeline();
    const context: Context = {
      RESULT: createAccumulated(0),
      NET: createAccumulated(0),
      GROSS: createConstant(1000),
      CUSTOMER_CREDIT: createContextual((context, step) => Promise.resolve(100 * step)),
      PRODUCT_TYPE: createCached(() => Promise.resolve('organic')),
      PRODUCT_AVAILABLE: createCached(() => Promise.resolve(true)),
      DISCOUNT: createCached(() => Promise.resolve(3)),
      TOTAL_DISCOUNT: createAccumulated(0),
    };

    pipeline.addStep(`
    RESULT = GROSS

    // RESULT = 1000
    `);

    pipeline.addStep(`
    RESULT += CUSTOMER_CREDIT
    NET = PRODUCT_AVAILABLE ? RESULT : 0

    // RESULT = 1100, NET = 1100
    `);

    pipeline.addStep(`
    RESULT = 100
    NET += PRODUCT_TYPE === 'organic' ? 400 : 0

    // RESULT = 100, NET = 1500
    `);

    pipeline.addStep(`
    NET += RESULT
    var total = NET
    NET = round(NET / DISCOUNT)

    TOTAL_DISCOUNT = total - NET

    // RESULT = 100, NET = 533, TOTAL_DISCOUNT = 1067
    `);

    return pipeline.execute(context).then(() => {
      expect(as.accumulated(context['RESULT']).value).to.be.equals(100);
      expect(as.accumulated(context['NET']).value).to.be.equals(533);
      expect(as.accumulated(context['TOTAL_DISCOUNT']).value).to.be.equals(1067);
    });
  });

});
