import {Parameter, ParameterValueType} from './param';

export interface Context {
  [id: string]: Parameter;
}

export interface Pipeline {
  addStep(step: string): this;
  execute(context: Context): Promise<void>;
}

interface StepData {
  dependencies: string[];
  apply(context: Context): Promise<ParameterValueType>;
}

function pipeline(): Pipeline {

  const steps: StepData[] = [];
  const params = Object.keys(context);

  function addStep(step: string) {



  }

  return null;

}
