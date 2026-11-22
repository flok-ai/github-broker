// Shared type guards for untrusted input: JSON bodies, upstream responses and environment values.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

// GitHub appends an underscore and enterprise shortcode to Enterprise Managed User names.
// Repo names can also contain underscores. This is a format check for the exact allowlist lookup.
export const repoNamePattern = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/
