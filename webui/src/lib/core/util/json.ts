/** Safe accessors for untyped JSON returned by RESTCONF and the orchestrator API. */

type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walk `path` through nested objects; returns undefined when any step is missing. */
export function at(value: unknown, ...path: (string | number)[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (Array.isArray(current) && typeof key === 'number') {
      current = current[key];
    } else if (isRecord(current) && typeof key === 'string') {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export function arrayAt(value: unknown, ...path: (string | number)[]): unknown[] {
  const found = at(value, ...path);
  return Array.isArray(found) ? found : [];
}

export function stringAt(value: unknown, ...path: (string | number)[]): string {
  const found = at(value, ...path);
  return found === undefined || found === null ? '' : String(found);
}

export function numberAt(value: unknown, ...path: (string | number)[]): number | null {
  const found = at(value, ...path);
  if (typeof found === 'number') return Number.isNaN(found) ? null : found;
  if (found === null || found === undefined || found === '') return null;
  const numeric = Number(found);
  return Number.isNaN(numeric) ? null : numeric;
}

export function booleanAt(value: unknown, ...path: (string | number)[]): boolean {
  return Boolean(at(value, ...path) ?? false);
}
