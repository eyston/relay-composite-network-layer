
export const pipeline = (obj, ...fns) => {
  return fns.reduce((obj, fn) => fn(obj), obj);
}

export const curry = (fn, ...args) => {
  return (arg) => fn(...[arg, ...args]);
}

export const push = (arr, item) => {
  return arr.concat(item)
}

export const flatten = arrs => {
  return arrs.reduce((a, b) => [...a, ...b], []);
}

export const get = (obj, field, defaultValue) => {
  if (obj) {
    return obj[field] || defaultValue;
  } else {
    return defaultValue;
  }
}

export const getIn = (obj, path, defaultValue) => {
  if (path.length === 1) {
    return get(obj, path[0], defaultValue)
  } else if (obj) {
    const key = path[0];
    return getIn(obj[key], path.slice(1), defaultValue);
  } else {
    return defaultValue;
  }
}

export const setIn = (obj, path, value) => {
  if (path.length === 1) {
    return {
      ...obj,
      [path[0]]: value
    };
  } else if (obj) {
    const key = path[0];
    return {
      ...obj,
      [key]: setIn(obj[key] || {}, path.slice(1), value)
    };
  } else {
    return setIn({}, path, value);
  }
}

export const update = (obj, field, defaultValue, updater) => {
  if (!updater) {
    updater = defaultValue;
    defaultValue = undefined;
  }

  return {
    ...obj,
    [field]: updater(obj[field] || defaultValue)
  };
}

export const updateIn = (obj, path, defaultValue, updater) => {
  if (path.length === 1) {
    return update(obj, path[0], defaultValue, updater);
  } else {
    const key = path[0];
    return {
      ...obj,
      [key]: updateIn(obj[key] || {}, path.slice(1), defaultValue, updater)
    }
  }
}
