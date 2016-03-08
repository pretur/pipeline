import * as Promise from 'bluebird';

import {Context} from './pipeline';

export const enum ParameterType {
  CONSTANT = 0,
  CACHED = 1,
  CONTEXTUAL = 2,
  ACCUMULATED = 3,
}

export interface Parameter {
  type: ParameterType;
}

export interface CachedParameter<T> extends Parameter {
  hasValue: boolean;
  value: T;
  resolve(): Promise<T>;
}

export interface ConstantParameter<T> extends Parameter {
  value: T;
}

export interface ContextualParameter<T> extends Parameter {
  resolve(context: Context, step: number): Promise<T>;
}

export interface AccumulationModifier<T> {
  (param: AccumulatedParameter<T>, context: Context, step: number, stepResult: T): Promise<T>;
}

export interface AccumulatedParameter<T> extends Parameter {
  initial: T;
  value: T;
  modify(context: Context, step: number, stepResult: T): Promise<T>;
}

export const is = {
  constant<T>(parameter: Parameter): parameter is ConstantParameter<T> {
    return parameter.type === ParameterType.CONSTANT;
  },

  cached<T>(parameter: Parameter): parameter is CachedParameter<T> {
    return parameter.type === ParameterType.CACHED;
  },

  contextual<T>(parameter: Parameter): parameter is ContextualParameter<T> {
    return parameter.type === ParameterType.CONTEXTUAL;
  },

  accumulated<T>(parameter: Parameter): parameter is AccumulatedParameter<T> {
    return parameter.type === ParameterType.ACCUMULATED;
  },
};

export const as = {
  constant<T>(parameter: Parameter): ConstantParameter<T> {
    return is.constant<T>(parameter) ? parameter : null;
  },

  cached<T>(parameter: Parameter): CachedParameter<T> {
    return is.cached<T>(parameter) ? parameter : null;
  },

  contextual<T>(parameter: Parameter): ContextualParameter<T> {
    return is.contextual<T>(parameter) ? parameter : null;
  },

  accumulated<T>(parameter: Parameter): AccumulatedParameter<T> {
    return is.accumulated<T>(parameter) ? parameter : null;
  },
};

export function createConstant<T>(value: T): ConstantParameter<T> {
  return {
    value,
    type: ParameterType.CONSTANT,
  };
}

export function createCached<T>(resolve: () => Promise<T>): CachedParameter<T> {

  const cache: CachedParameter<T> = {
    hasValue: false,
    value: null,
    resolve: null,
    type: ParameterType.CACHED,
  };

  let resolvePromise = null;

  cache.resolve = function resolveCache(): Promise<T> {
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

export function createContextual<T>(
  resolve: (context: Context, step: number) => Promise<T>
): ContextualParameter<T> {
  return {
    resolve,
    type: ParameterType.CONTEXTUAL,
  };
}

export function createAccumulated<T>(
  initial: T, modifier?: AccumulationModifier<T>
): AccumulatedParameter<T> {
  const accumulated: AccumulatedParameter<T> = {
    initial,
    value: initial,
    modify: null,
    type: ParameterType.ACCUMULATED,
  };

  accumulated.modify = (context: Context, step, stepResult: T) => {

    const modifierPromise = modifier
      ? modifier(accumulated, context, step, stepResult)
      : Promise.resolve(stepResult);

    return modifierPromise.then(result => {
      accumulated.value = result;
      return result;
    });

  };

  return accumulated;
}
