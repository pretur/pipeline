/// <reference path="typings/main.d.ts" />

declare namespace Pretur {
  namespace Pipeline {

    const enum ParameterType {
      CONSTANT = 0,
      CACHED = 1,
      CONTEXTUAL = 2,
      ACCUMULATED = 3,
    }

    interface Parameter {
      id: string;
      type: ParameterType;
    }

    namespace Parameter {
      interface Cached extends Parameter {
        hasValue: boolean;
        value: number;
        resolve(): Promise<number>;
      }

      interface Constant extends Parameter {
        value: number;
      }

      interface Contextual extends Parameter {
        resolve(context: Context): Promise<number>;
      }

      interface Accumulated extends Parameter {
        value: number;
        set(balance: number): void;
      }
    }

    interface Context {
      [id: string]: Parameter;
    }

    interface Step {
      dependencies: string[];
      apply(context: Context): Promise<number>;
    }
  }
}
