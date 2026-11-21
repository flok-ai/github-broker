import type { RepositoryAssignment } from './token-exchange.types.js'
import { isPositiveSafeInteger, isRecord } from './validation.js'

const repositoryNamePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function hasPositiveIds(entry: Record<string, unknown>): boolean {
  return isPositiveSafeInteger(entry.repositoryId) && isPositiveSafeInteger(entry.installationId)
}

// Exactly repositoryId and installationId: two keys, both positive integers.
function isRepositoryAssignment(value: unknown): value is RepositoryAssignment {
  return isRecord(value) && Object.keys(value).length === 2 && hasPositiveIds(value)
}

function isRepositoryMapping(value: unknown): value is Record<string, RepositoryAssignment> {
  return isRecord(value)
    && Object.keys(value).length > 0
    && Object.entries(value).every(([name, assignment]) => repositoryNamePattern.test(name) && isRepositoryAssignment(assignment))
}

export function parseRepositoryMapping(raw: string | undefined): Record<string, RepositoryAssignment> {
  const value: unknown = JSON.parse(raw ?? '')
  if (!isRepositoryMapping(value)) {
    throw new Error('Expected a nonempty repository mapping with positive integer IDs')
  }
  return value
}
