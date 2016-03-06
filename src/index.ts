import * as param from './param';

export {param};

export interface Context {
  [id: string]: param.Parameter;
}

export interface Step {
  dependencies: string[];
  apply(context: Context): Promise<number>;
}
