
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

export const values = obj => {
  return Object.keys(obj).map(key => obj[key]);
}

export const union = (...arrs) => {
  return arrs.reduce((a, b) => {
    return [...new Set([...a, ...b])];
  });
}

export const intersect = (...arrs) => {
  return arrs.reduce((a, b) => {
    const bs = new Set(b);
    return a.filter(n => bs.has(n));
  });
}

export const difference = (...arrs) => {
  return arrs.reduce((a, b) => {
    const bs = new Set(b);
    return a.filter(n => !bs.has(n));
  });
}

export const pick = (obj, ...keys) => {
  return into({}, Object.keys(obj)
    .filter(key => keys.includes(key) && obj[key])
    .map(key => [key, obj[key]]));
}

export const pairs = obj => {
  return Object.keys(obj).map(key => [key, obj[key]]);
}

export const into = (obj, kvps) => {
  return kvps.reduce((obj, [key, value]) => ({
    ...obj,
    [key]: value
  }), obj);
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

export const set = (obj, key, value) => {
  return {
    ...obj,
    [key]: value
  };
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
    if (Array.isArray(obj)) {
      const copy = obj.slice();
      copy[key] = updateIn(copy[key] || {}, path.slice(1), defaultValue, updater);
      return copy;
    } else {
      return {
        ...obj,
        [key]: updateIn(obj[key] || {}, path.slice(1), defaultValue, updater)
      };
    }
  }
}
