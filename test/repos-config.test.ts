import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test as base } from 'vitest'
import { createYamlRepoLookup, RepoConfigError } from '#src/repos-config.js'

const test = base.extend<{ path: string }>({
  path: async ({ onTestFinished }, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'broker-repos-'))
    onTestFinished(() => rm(directory, {
      recursive: true,
      force: true,
    }))
    await use(join(directory, 'secret-marker.yaml'))
  },
})

test('reads the YAML allowlist once and looks up exact repo names', async ({ path }) => {
  await writeFile(path, `
managed_owner/repo:
  repositoryId: 1
  installationId: 2
other/repo: {repositoryId: 0x1F, installationId: 4}
`)
  const lookup = await createYamlRepoLookup(path)
  await writeFile(path, '{}')
  await expect(lookup('managed_owner/repo')).resolves.toEqual({
    repositoryId: 1,
    installationId: 2,
  })
  await expect(lookup('other/repo')).resolves.toEqual({
    repositoryId: 31,
    installationId: 4,
  })
  await expect(lookup('Managed_Owner/repo')).resolves.toBeUndefined()
  await expect(lookup('unknown/repo')).resolves.toBeUndefined()
})

test('sanitizes unreadable file errors', async ({ path }) => {
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config file unreadable'),
  )
})

test.for([
  ['syntax error', 'secret-marker: [unterminated'],
  ['duplicate repos', 'owner/repo: {repositoryId: 1, installationId: 2}\nowner/repo: secret-marker'],
  ['duplicate fields', 'owner/repo: {repositoryId: 1, installationId: 2, repositoryId: secret-marker}'],
])('sanitizes invalid YAML with %s', async ([, contents], { path }) => {
  await writeFile(path, contents)
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config is invalid YAML'),
  )
})

test.for([
  ['empty file', ''],
  ['empty map', '{}'],
  ['array', '[]'],
  ['scalar', 'secret-marker'],
  ['string ID', 'owner/repo: {repositoryId: secret-marker, installationId: 2}'],
  ['zero ID', 'owner/repo: {repositoryId: 1, installationId: 0}'],
  ['fractional ID', 'owner/repo: {repositoryId: 1.5, installationId: 2}'],
  ['unsafe ID', 'owner/repo: {repositoryId: 1, installationId: 9007199254740992}'],
  ['invalid repo', 'secret-marker: {repositoryId: 1, installationId: 2}'],
  ['owner dot', 'owner.name/repo: {repositoryId: 1, installationId: 2}'],
  ['extra field', 'owner/repo: {repositoryId: 1, installationId: 2, extra: secret-marker}'],
  ['merge key', 'owner/repo: {repositoryId: 1, installationId: 2, <<: {repositoryId: 3}}'],
  ['YAML 1.1 merge key', '%YAML 1.1\n---\nowner/repo: {installationId: 2, <<: {repositoryId: 1}}'],
  ['missing field', 'owner/repo: {repositoryId: 1}'],
  ['array assignment', 'owner/repo: [1, 2]'],
])('rejects invalid allowlist content with %s', async ([, contents], { path }) => {
  await writeFile(path, contents)
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config must be a nonempty owner/repo mapping with positive integer repositoryId and installationId'),
  )
})
