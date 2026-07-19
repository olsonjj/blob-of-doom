/**
 * Lightweight validation helpers shared across server function validators.
 *
 * Replaces copy-pasted `typeof` blocks with consistent, testable utilities.
 */

/** Assert input is a non-null object. Throws with the given message if not. */
export function assertObject(input: unknown, message = 'Invalid input'): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}

/** Extract a required string field from an object. Throws if missing or wrong type. */
export function assertString(obj: Record<string, unknown>, field: string, message?: string): string {
  const val = obj[field];
  if (typeof val !== 'string') {
    throw new Error(message ?? `${field} is required`);
  }
  return val;
}

/** Extract a required number field from an object. Throws if missing or wrong type. */
export function assertNumber(obj: Record<string, unknown>, field: string, message?: string): number {
  const val = obj[field];
  if (typeof val !== 'number') {
    throw new Error(message ?? `${field} is required`);
  }
  return val;
}
