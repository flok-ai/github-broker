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
- name: Shared display name
  slug: managed_owner/repo_name
  repositoryId: 1
  installationId: 2
- {name: Shared display name, slug: other/repo, repositoryId: 0x1F, installationId: 4}
`)
  const lookup = await createYamlRepoLookup(path)
  await writeFile(path, '[]')
  await expect(lookup('managed_owner/repo_name')).resolves.toEqual({
    repositoryId: 1,
    installationId: 2,
  })
  await expect(lookup('other/repo')).resolves.toEqual({
    repositoryId: 31,
    installationId: 4,
  })
  await expect(lookup('Managed_Owner/repo_name')).resolves.toBeUndefined()
  await expect(lookup('unknown/repo')).resolves.toBeUndefined()
  await expect(lookup('Shared display name')).resolves.toBeUndefined()
})

test('sanitizes unreadable file errors', async ({ path }) => {
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config file unreadable'),
  )
})

test.for([['syntax error', 'secret-marker: [unterminated'], ['duplicate fields', '- {name: Example, slug: owner/repo, repositoryId: 1, installationId: 2, repositoryId: secret-marker}']])('sanitizes invalid YAML with %s', async ([, contents], { path }) => {
  await writeFile(path, contents)
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config is invalid YAML'),
  )
})

test('rejects duplicate slugs with different display names and IDs', async ({ path }) => {
  await writeFile(path, `
- {name: First, slug: owner/secret-marker, repositoryId: 1, installationId: 2}
- {name: Second, slug: owner/secret-marker, repositoryId: 3, installationId: 4}
`)
  await expect(createYamlRepoLookup(path)).rejects.toThrow(new RepoConfigError('Repo config contains duplicate slugs'))
})

test.for([
  ['empty file', ''],
  ['empty map', '{}'],
  ['previous mapping shape', 'owner/repo: {repositoryId: 1, installationId: 2}'],
  ['empty list', '[]'],
  ['scalar', 'secret-marker'],
  ['string ID', '- {name: Example, slug: owner/repo, repositoryId: secret-marker, installationId: 2}'],
  ['zero ID', '- {name: Example, slug: owner/repo, repositoryId: 1, installationId: 0}'],
  ['fractional ID', '- {name: Example, slug: owner/repo, repositoryId: 1.5, installationId: 2}'],
  ['unsafe ID', '- {name: Example, slug: owner/repo, repositoryId: 1, installationId: 9007199254740992}'],
  ['invalid slug', '- {name: Example, slug: secret-marker, repositoryId: 1, installationId: 2}'],
  ['owner dot', '- {name: Example, slug: owner.name/repo, repositoryId: 1, installationId: 2}'],
  ['non-string slug', '- {name: Example, slug: 42, repositoryId: 1, installationId: 2}'],
  ['blank name', '- {name: " ", slug: owner/repo, repositoryId: 1, installationId: 2}'],
  ['non-string name', '- {name: 42, slug: owner/repo, repositoryId: 1, installationId: 2}'],
  ['extra field', '- {name: Example, slug: owner/repo, repositoryId: 1, installationId: 2, extra: secret-marker}'],
  ['merge key', '- {name: Example, slug: owner/repo, repositoryId: 1, installationId: 2, <<: {repositoryId: 3}}'],
  ['YAML 1.1 merge key', '%YAML 1.1\n---\n- {name: Example, slug: owner/repo, installationId: 2, <<: {repositoryId: 1}}'],
  ['missing field', '- {slug: owner/repo, repositoryId: 1, installationId: 2}'],
  ['array assignment', '- [1, 2]'],
])('rejects invalid allowlist content with %s', async ([, contents], { path }) => {
  await writeFile(path, contents)
  await expect(createYamlRepoLookup(path)).rejects.toThrow(
    new RepoConfigError('Repo config must be a nonempty list of entries with name, slug, repositoryId and installationId'),
  )
})
