import * as Promise from 'bluebird';

import {Context, StepResult} from './index';

export const enum ParameterType {
  CONSTANT = 0,
  CACHED = 1,
  CONTEXTUAL = 2,
  ACCUMULATED = 3,
}

export interface Parameter {
  id: string;
  type: ParameterType;
}

export interface CachedParameter extends Parameter {
  hasValue: boolean;
  value: number;
  resolve(): Promise<number>;
}

export interface ConstantParameter extends Parameter {
  value: number;
}

export interface ContextualParameter extends Parameter {
  resolve(context: Context): Promise<number>;
}

export interface AccumulationModifier {
  (param: AccumulatedParameter, context: Context, step: StepResult): Promise<number>;
}

export interface AccumulatedParameter extends Parameter {
  initial: number;
  value: number;
  modify(context: Context, step: StepResult): Promise<number>;
}

export const is = {
  constant(parameter: Parameter): parameter is ConstantParameter {
    return parameter.type === ParameterType.CONSTANT;
  },

  cached(parameter: Parameter): parameter is CachedParameter {
    return parameter.type === ParameterType.CACHED;
  },

  contextual(parameter: Parameter): parameter is ContextualParameter {
    return parameter.type === ParameterType.CONTEXTUAL;
  },

  accumulated(parameter: Parameter): parameter is AccumulatedParameter {
    return parameter.type === ParameterType.ACCUMULATED;
  },
};

export function createConstant(id: string, value: number): ConstantParameter {
  return {
    id,
    value,
    type: ParameterType.CONSTANT,
  };
}

export function createCached(
  id: string,
  resolve: () => Promise<number>
): CachedParameter {

  const cache: CachedParameter = {
    id,
    hasValue: false,
    value: null,
    resolve: null,
    type: ParameterType.CACHED,
  };

  let resolvePromise = null;

  cache.resolve = function resolveCache(): Promise<number> {
    if (cache.hasValue) {
      return Promise.resolve(cache.value);
    }

    if (resolvePromise) {
      return resolvePromise;
    }

    resolvePromise = resolve().then(result => {
      cache.hasValue = true;
      cache.value = result;
      resolvePromise = null;
      return result;
    });

    return resolvePromise;
  };

  return cache;
}

export function createContextual(id: string, resolve: (context: Context) => Promise<number>): ContextualParameter {
  return {
    id,
    resolve,
    type: ParameterType.CONTEXTUAL,
  };
}

export function createAccumulated(id: string, initial: number, modifier: AccumulationModifier): AccumulatedParameter {
  const accumulated: AccumulatedParameter = {
    id,
    initial,
    value: initial,
    modify: null,
    type: ParameterType.ACCUMULATED,
  };

  accumulated.modify = (context: Context, step: StepResult) => {

    return modifier(accumulated, context, step).then(result => {
      accumulated.value = result;
      return result;
    });

  };

  return accumulated;
}
