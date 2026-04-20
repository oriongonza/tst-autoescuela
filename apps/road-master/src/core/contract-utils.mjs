/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}

/**
 * @template T extends { id: string }
 * @param {readonly T[]} items
 * @param {string} [label]
 * @returns {Record<string, T>}
 */
export function indexById(items, label = "items") {
  return indexBy(items, "id", label);
}

/**
 * @template T extends { id: string }
 * @param {readonly T[]} items
 * @param {string} [label]
 * @returns {readonly T[]}
 */
export function assertUniqueIds(items, label = "items") {
  indexById(items, label);
  return items;
}

/**
 * @template T
 * @param {readonly T[]} items
 * @param {keyof T} key
 * @param {string} [label]
 * @returns {Record<string, T>}
 */
export function indexBy(items, key, label = "items") {
  const index = Object.create(null);

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new Error(`Cannot index ${label}: item is not an object.`);
    }

    const value = item[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Cannot index ${label}: item is missing a stable string ${String(key)}.`);
    }
    if (index[value]) {
      throw new Error(`Cannot index ${label}: duplicate ${String(key)} "${value}".`);
    }
    index[value] = item;
  }

  return index;
}
