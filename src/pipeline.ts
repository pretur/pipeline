import {Context, StepResult} from './index';

export interface Pipeline {
  addStep(step: string): this;
  execute(): this;
  accumulation: number[];
}
