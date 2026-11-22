import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import type { RepoLookup, RepositoryAssignment } from './token-exchange.types.js'
import { isPositiveSafeInteger, isRecord, repoNamePattern } from './validation.js'

const invalidContent = 'Repo config must be a nonempty list of entries with name, slug, repositoryId and installationId'

export class RepoConfigError extends Error {
  constructor(message:
    | 'Repo config file unreadable'
    | 'Repo config is invalid YAML'
    | 'Repo config contains duplicate slugs'
    | typeof invalidContent) {
    super(message)
    this.name = 'RepoConfigError'
  }
}

function isRepoEntry(value: unknown): value is RepositoryAssignment & {
  name: string
  slug: string
} {
  return isRecord(value)
    && Object.keys(value).length === 4
    && typeof value.name === 'string'
    && value.name.trim() !== ''
    && typeof value.slug === 'string'
    && repoNamePattern.test(value.slug)
    && isPositiveSafeInteger(value.repositoryId)
    && isPositiveSafeInteger(value.installationId)
}

export async function createYamlRepoLookup(path: string): Promise<RepoLookup> {
  let contents: string
  try {
    contents = await readFile(path, 'utf8')
  } catch {
    throw new RepoConfigError('Repo config file unreadable')
  }

  let value: unknown
  try {
    value = parse(contents, {
      logLevel: 'error',
      schema: 'core',
      prettyErrors: false,
    })
  } catch {
    // YAML parser errors can include excerpts of the config.
    throw new RepoConfigError('Repo config is invalid YAML')
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new RepoConfigError(invalidContent)
  }
  const assignments = new Map<string, RepositoryAssignment>()
  for (const entry of value) {
    if (!isRepoEntry(entry)) {
      throw new RepoConfigError(invalidContent)
    }
    const {
      slug, repositoryId, installationId,
    } = entry
    if (assignments.has(slug)) {
      throw new RepoConfigError('Repo config contains duplicate slugs')
    }
    assignments.set(slug, {
      repositoryId,
      installationId,
    })
  }
  return async repo => assignments.get(repo)
}
