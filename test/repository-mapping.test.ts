import { expect, test } from 'vitest'
import { parseRepositoryMapping } from '../src/repository-mapping.js'

test('parses repository assignments keyed by owner and repository name', () => {
  const assignments = {
    'example/repo.one': {
      repositoryId: 1,
      installationId: 2,
    },
    'another-owner/repo_two': {
      repositoryId: 3,
      installationId: 4,
    },
  }
  expect(parseRepositoryMapping(JSON.stringify(assignments))).toEqual(assignments)
})

test.each([
  ['missing input', undefined],
  ['malformed JSON', 'not JSON'],
  ['empty mapping', '{}'],
  ['array instead of mapping', '[]'],
  ['invalid repository name', '{"repo":{"repositoryId":1,"installationId":2}}'],
  ['array instead of assignment', '{"example/repo":[1,2]}'],
  ['extra assignment key', '{"example/repo":{"repositoryId":1,"installationId":2,"extra":3}}'],
  ['string ID', '{"example/repo":{"repositoryId":"1","installationId":2}}'],
  ['zero ID', '{"example/repo":{"repositoryId":1,"installationId":0}}'],
  ['unsafe ID', '{"example/repo":{"repositoryId":9007199254740992,"installationId":2}}'],
])('rejects %s', (_case, raw) => {
  expect(() => parseRepositoryMapping(raw)).toThrow()
})
