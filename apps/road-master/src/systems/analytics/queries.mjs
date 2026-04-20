function resolveKey(item, iteratee) {
  if (typeof iteratee === "function") {
    return iteratee(item);
  }

  if (typeof iteratee === "string" && iteratee.length > 0) {
    return item?.[iteratee];
  }

  return item;
}

function normalizeKey(value) {
  if (value == null) {
    return "unknown";
  }

  return typeof value === "string" ? value : String(value);
}

export function groupBy(items = [], iteratee) {
  const groups = Object.create(null);

  for (const item of Array.isArray(items) ? items : []) {
    const key = normalizeKey(resolveKey(item, iteratee));
    const bucket = groups[key] ?? [];
    bucket.push(item);
    groups[key] = bucket;
  }

  return groups;
}

export function countBy(items = [], iteratee) {
  const counts = Object.create(null);

  for (const item of Array.isArray(items) ? items : []) {
    const key = normalizeKey(resolveKey(item, iteratee));
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export function sumBy(items = [], iteratee) {
  let total = 0;

  for (const item of Array.isArray(items) ? items : []) {
    const value = resolveKey(item, iteratee);
    if (Number.isFinite(value)) {
      total += value;
    }
  }

  return total;
}

export function averageBy(items = [], iteratee) {
  let total = 0;
  let count = 0;

  for (const item of Array.isArray(items) ? items : []) {
    const value = resolveKey(item, iteratee);
    if (!Number.isFinite(value)) {
      continue;
    }

    total += value;
    count += 1;
  }

  return count > 0 ? total / count : null;
}
