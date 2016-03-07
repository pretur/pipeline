import * as acorn from 'acorn';

import {discoverDependencies} from './utils';
import {Parameter} from './param';

export interface Context {
  [id: string]: Parameter;
}

interface CompiledStep {
  apply(context: Context): Promise<void>;
}

export class Pipeline {
  private steps: string[] = [];
  private stepsAst: ESTree.Program[] = [];
  private stepsCompiled: ESTree.Program[] = [];

  addStep(step: string): this {
    this.stepsAst.push(acorn.parse(step));
    this.steps.push(step);
    return this;
  }

  execute(context: Context): Promise<void> {
    return null;
  }
}


    //const dependencies = discoverDependencies(step)
