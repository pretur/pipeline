import * as Promise from 'bluebird';
import * as esprima from 'esprima';

import {discoverDependencies, contextify, executeExpression} from './utils';
import {Parameter, is} from './param';

export interface Context {
  [id: string]: Parameter;
}

export function resolveDependencies(context: Context, dependencies: string[], step: number): Promise<any> {
  const dependencyPromises = {};

  dependencies.forEach(dependency => {
    const param = context[dependency];

    if (!param) {
      dependencyPromises[dependency] = null;
    } else if (is.constant<any>(param)) {
      dependencyPromises[dependency] = param.value;
    } else if (is.cached<any>(param)) {
      dependencyPromises[dependency] = param.hasValue ? param.value : param.resolve();
    } else if (is.contextual<any>(param)) {
      dependencyPromises[dependency] = param.resolve(context, step);
    } else if (is.accumulated<any>(param)) {
      dependencyPromises[dependency] = param.value;
    }

  });

  return Promise.props(dependencyPromises);
}

export function updateContext(
  context: Context,
  executionContext: any,
  dependencies: string[],
  step: number
): Promise<void> {
  const modificationPromises = [];

  dependencies.forEach(dependency => {
    const param = context[dependency];
    if (param && is.accumulated<any>(param)) {
      modificationPromises.push(param.modify(context, step, executionContext[dependency]));
    }
  });

  return <Promise<any>>Promise.all(modificationPromises);
}

export class Pipeline {
  private steps: string[] = [];
  private stepsAst: ESTree.Program[] = [];

  addStep(step: string): this {
    this.stepsAst.push(esprima.parse(step));
    this.steps.push(step);
    return this;
  }

  execute(context: Context): Promise<void> {
    if (this.steps.length === 0) {
      return Promise.resolve();
    }

    let stepPromise = Promise.resolve();

    this.steps.forEach((code, index) => {
      const ast = this.stepsAst[index];

      stepPromise = stepPromise.then(() => {
        const dependencies = discoverDependencies(ast, Object.keys(context));
        return resolveDependencies(context, dependencies, index).then(resolvedDependencies => {
          const executionContext = contextify(resolvedDependencies);

          executeExpression(code, executionContext);

          return updateContext(context, executionContext, dependencies, index);
        });

      });
    });

    return stepPromise;
  }
}
