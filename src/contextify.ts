function assign(target, ...rest) {
  const output = Object(target);
  rest.forEach(source => {
    if (typeof source === 'object' && source !== null) {
      Object.keys(source).forEach(key => output[key] = source[key]);
    }
  });
  return output;
};

const math = {
  E: Math.E,
  PI: Math.PI,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  atan2: Math.atan2,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
};

export default function contextify<T>(context: T): T & typeof Math {
  return assign(context, math);
}
