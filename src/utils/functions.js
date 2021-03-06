
import {
  isMap,
  isSet,
  isArray,
  isObject,
  isFunction,
  isUndefinedOrNull,
  isNumber,
  isString,
  isPrimitive,
} from './isType';

export function noop () {}

export function iteratee (match) {
  if (isUndefinedOrNull(match)) return (v) => v;

  if (isFunction(match)) return match;

  if (isString(match)) {
    return (o) => {
      if (isArray(o)) return o.includes(match);
      if (isMap(o)) return o.get(match);
      if (isSet(o)) return o.has(match);
      if (isPrimitive(o)) return o[match];
      if (isObject(o)) return o[match];
      return o === match;
    };
  }

  if (isNumber(match)) {
    return (o) => {
      if (isMap(o)) return o.get(match);
      if (isSet(o)) return o.has(match);
      if (isObject(o) || isArray(o)) return o[match];
      if (isNumber(o)) return o === match;
      if (isString(o)) return Number(o) === match;
      return o === match;
    };
  }

  if (isArray(match)) {
    const [ key, value ] = match;
    return (o) => o[key] === value;
  }

  if (isObject(match)) {
    // create an array of key/value iteratees
    const tests = Object.entries(match).map(iteratee);
    // evaluate the object against the array
    return (o) => {
      for (const t of tests) {
        if (!t(o)) return false;
      }
      return true;
    };
  }
}

export function sorter (match) {

  if (isFunction(match)) return match;

  function qs (a, b) {
    if (a > b) return 1;
    else if (b > a) return -1;
    return 0;
  }

  if (isString(match)) {
    return (a, b) => {
      if (!isObject(a) && !isObject(b)) return qs(a, b);
      if (!isObject(a)) return -1;
      if (!isObject(b)) return 1;
      return qs(a[match], b[match]);
    };
  }

  if (isArray(match)) {
    return (a, b) => {
      if (!isObject(a) && !isObject(b)) return qs(a, b);
      if (!isObject(a)) return -1;
      if (!isObject(b)) return 1;
      for (const k of match) {
        const v = qs(a[k], b[k]);
        if (v) return v;
      }
      return 0;
    };
  }

  if (isObject(match)) {
    return (a, b) => {
      if (!isObject(a) && !isObject(b)) return qs(a, b);
      if (!isObject(a)) return -1;
      if (!isObject(b)) return 1;
      for (const [ k, d ] of Object.entries(match)) {
        const v = qs(a[k], b[k]) * (d < 0 ? -1 : 1);
        if (v) return v;
      }
      return 0;
    };
  }

  return (a, b) => {
    if (!isObject(a) && !isObject(b)) return qs(a, b);
    if (!isObject(a)) return -1;
    if (!isObject(b)) return 1;
    return 0;
  };
}
