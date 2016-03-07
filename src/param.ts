import * as Promise from 'bluebird';

import {Context} from './pipeline';

export const enum ParameterType {
  CONSTANT = 0,
  CACHED = 1,
  CONTEXTUAL = 2,
  ACCUMULATED = 3,
}

export type ParameterValueType = number | string | boolean;

export interface Parameter {
  type: ParameterType;
}

export interface CachedParameter<T extends ParameterValueType> extends Parameter {
  hasValue: boolean;
  value: T;
  resolve(): Promise<T>;
}

export interface ConstantParameter<T extends ParameterValueType> extends Parameter {
  value: T;
}

export interface ContextualParameter<T extends ParameterValueType> extends Parameter {
  resolve(context: Context): Promise<T>;
}

export interface AccumulationModifier<T extends ParameterValueType> {
  (param: AccumulatedParameter<T>, context: Context, stepResult: T): Promise<T>;
}

export interface AccumulatedParameter<T extends ParameterValueType> extends Parameter {
  initial: T;
  value: T;
  modify(context: Context, step: T): Promise<T>;
}

export const is = {
  constant<T>(parameter: Parameter): parameter is ConstantParameter<ParameterValueType> {
    return parameter.type === ParameterType.CONSTANT;
  },

  cached<T>(parameter: Parameter): parameter is CachedParameter<ParameterValueType> {
    return parameter.type === ParameterType.CACHED;
  },

  contextual<T>(parameter: Parameter): parameter is ContextualParameter<ParameterValueType> {
    return parameter.type === ParameterType.CONTEXTUAL;
  },

  accumulated<T>(parameter: Parameter): parameter is AccumulatedParameter<ParameterValueType> {
    return parameter.type === ParameterType.ACCUMULATED;
  },
};

export function createConstant<T extends ParameterValueType>(value: T): ConstantParameter<T> {
  return {
    value,
    type: ParameterType.CONSTANT,
  };
}

export function createCached<T extends ParameterValueType>(resolve: () => Promise<T>): CachedParameter<T> {

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

export function createContextual<T extends ParameterValueType>(
  resolve: (context: Context) => Promise<T>
): ContextualParameter<T> {
  return {
    resolve,
    type: ParameterType.CONTEXTUAL,
  };
}

export function createAccumulated<T extends ParameterValueType>(
  initial: T, modifier: AccumulationModifier<T>
): AccumulatedParameter<T> {
  const accumulated: AccumulatedParameter<T> = {
    initial,
    value: initial,
    modify: null,
    type: ParameterType.ACCUMULATED,
  };

  accumulated.modify = (context: Context, step: T) => {

    return modifier(accumulated, context, step).then(result => {
      accumulated.value = result;
      return result;
    });

  };

  return accumulated;
}
