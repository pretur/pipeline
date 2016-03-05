import * as Promise from 'bluebird';

export const is = {
  constant(parameter: Pretur.Pipeline.Parameter): parameter is Pretur.Pipeline.Parameter.Constant {
    return parameter.type === Pretur.Pipeline.ParameterType.CONSTANT;
  },

  cached(parameter: Pretur.Pipeline.Parameter): parameter is Pretur.Pipeline.Parameter.Cached {
    return parameter.type === Pretur.Pipeline.ParameterType.CACHED;
  },

  contextual(parameter: Pretur.Pipeline.Parameter): parameter is Pretur.Pipeline.Parameter.Contextual {
    return parameter.type === Pretur.Pipeline.ParameterType.CONTEXTUAL;
  },

  accumulated(parameter: Pretur.Pipeline.Parameter): parameter is Pretur.Pipeline.Parameter.Accumulated {
    return parameter.type === Pretur.Pipeline.ParameterType.ACCUMULATED;
  },
};

export function createConstant(id: string, value: number): Pretur.Pipeline.Parameter.Constant {
  return {
    id,
    value,
    type: Pretur.Pipeline.ParameterType.CONSTANT,
  };
}

export function createCached(
  id: string,
  resolve: () => Promise<number>
): Pretur.Pipeline.Parameter.Cached {

  const cache: Pretur.Pipeline.Parameter.Cached = {
    id,
    hasValue: false,
    value: null,
    resolve: null,
    type: Pretur.Pipeline.ParameterType.CACHED,
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

export function createContextual(
  id: string,
  resolve: (context: Pretur.Pipeline.Context) => Promise<number>
): Pretur.Pipeline.Parameter.Contextual {
  return {
    id,
    resolve,
    type: Pretur.Pipeline.ParameterType.CONTEXTUAL,
  };
}

export function createAccumulated(id: string, initial?: number): Pretur.Pipeline.Parameter.Accumulated {
  const cache: Pretur.Pipeline.Parameter.Accumulated = {
    id,
    value: initial || 0,
    set: null,
    type: Pretur.Pipeline.ParameterType.ACCUMULATED,
  };
  cache.set = (balance: number) => cache.value = balance;
  return cache;
}
