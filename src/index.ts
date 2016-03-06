import * as param from './param';
import * as utils from './utils';
import {Pipeline} from './pipeline';

export {param, utils, Pipeline};

export interface Context {
  [id: string]: param.Parameter;
}

export interface StepResult {
  result: number;
  ordinal: number;
}
