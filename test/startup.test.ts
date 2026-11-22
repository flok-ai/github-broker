import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { startServer } from '../src/start-server.js'
import { startupEnvironment } from './startup-fixture.js'

test.for(['default', 'configured'])('starts with a %s repo config path', async (path, { onTestFinished }) => {
  const fixture = startupEnvironment()
  onTestFinished(fixture.cleanup)
  const app = await startServer({
    ...fixture.env,
    GH_REPOS_CONFIG_PATH: path === 'configured' ? fixture.env.GH_REPOS_CONFIG_PATH : undefined,
    PORT: '0',
  })
  onTestFinished(() => app.close())

  expect(app.listeningOrigin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  const health = await app.inject('/healthz')
  expect(health.statusCode).toBe(200)
  const exchange = await app.inject({
    method: 'POST',
    url: '/v1/github-token',
  })
  expect(exchange.statusCode).toBe(401)
})

test.for([
  [{ GH_REPOS_CONFIG_PATH: '/secret-marker/missing.yaml' }, 'Repo config file unreadable'],
  [{ GH_APP_ID: undefined }, 'GH_APP_ID missing or not numeric'],
  [{ GH_APP_ID: 'secret-marker' }, 'GH_APP_ID missing or not numeric'],
  [{ GH_APP_PRIVATE_KEY_PATH: undefined }, 'GH_APP_PRIVATE_KEY_PATH missing'],
  [{ GH_APP_PRIVATE_KEY_PATH: '/secret-marker/missing.pem' }, 'Private key file unreadable'],
  [{ KUBERNETES_API_URL: 'http://secret-marker' }, 'Invalid Kubernetes configuration: check KUBERNETES_API_URL and KUBERNETES_SERVICE_ACCOUNT_TOKEN_PATH'],
] as const)('rejects invalid startup configuration with a fixed error %#', async ([overrides, message], { onTestFinished }) => {
  const fixture = startupEnvironment()
  onTestFinished(fixture.cleanup)
  await expect(startServer({
    ...fixture.env,
    ...overrides,
  })).rejects.toMatchObject({ message })
})

test('invalid private key content is never included in startup errors', async ({ onTestFinished }) => {
  const fixture = startupEnvironment()
  onTestFinished(fixture.cleanup)
  writeFileSync(fixture.env.GH_APP_PRIVATE_KEY_PATH, 'secret-marker-invalid-private-key')
  await expect(startServer(fixture.env)).rejects.toMatchObject({ message: 'Private key is invalid' })
})

test('invalid configuration exits the process before listening with a fixed diagnostic', ({ onTestFinished }) => {
  const fixture = startupEnvironment()
  onTestFinished(fixture.cleanup)
  writeFileSync(fixture.env.GH_REPOS_CONFIG_PATH, 'owner/repo: {repositoryId: !secret-marker forbidden, installationId: 2}')
  const result = spawnSync(process.execPath, ['dist/server.js'], {
    env: {
      ...process.env,
      ...fixture.env,
    },
    encoding: 'utf8',
    timeout: 5000,
  })
  expect(result.status).toBe(1)
  expect(result.stderr.trim()).toBe('Repo config must be a nonempty owner/repo mapping with positive integer repositoryId and installationId')
  expect(result.stdout + result.stderr).not.toMatch(/secret-marker|Server listening/)
})
