import {Context, StepResult} from './index';

export interface Pipeline {
  addStep(step: string): this;
  execute(): Promise<number[]>;
}

interface StepData {
  dependencies: string[];
  apply(context: Context): Promise<number>;
}

function getPreviousStepIds(currentStep: number): string[] {
  const ids = [];
  for (let i = 1; i < currentStep; i++) {
    ids.push(`STEP_${i}`);
  }
  return ids;
}

function pipeline(context: Context): Pipeline {

  const steps: StepData[] = [];
  const params = Object.keys(context);

  function addStep(step: string) {



  }

  return null;

}
