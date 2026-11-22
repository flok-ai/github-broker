import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import type { RepoLookup, RepositoryAssignment } from './token-exchange.types.js'
import { isPositiveSafeInteger, isRecord, repoNamePattern } from './validation.js'

export class RepoConfigError extends Error {
  constructor(message:
    | 'Repo config file unreadable'
    | 'Repo config is invalid YAML'
    | 'Repo config must be a nonempty owner/repo mapping with positive integer repositoryId and installationId') {
    super(message)
    this.name = 'RepoConfigError'
  }
}

function isRepositoryAssignment(value: unknown): value is RepositoryAssignment {
  return isRecord(value)
    && Object.keys(value).length === 2
    && isPositiveSafeInteger(value.repositoryId)
    && isPositiveSafeInteger(value.installationId)
}

function isRepositoryMapping(value: unknown): value is Record<string, RepositoryAssignment> {
  return isRecord(value)
    && Object.keys(value).length > 0
    && Object.entries(value).every(([repo, assignment]) => repoNamePattern.test(repo) && isRepositoryAssignment(assignment))
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

  if (!isRepositoryMapping(value)) {
    throw new RepoConfigError('Repo config must be a nonempty owner/repo mapping with positive integer repositoryId and installationId')
  }
  const assignments = new Map(Object.entries(value))
  return async repo => assignments.get(repo)
}
