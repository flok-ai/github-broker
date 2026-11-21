import { expect, test, vi } from 'vitest'

test('server exits with a fixed diagnostic when the repository mapping is malformed', async ({ onTestFinished }) => {
  const exit = new Error('process.exit intercepted')
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw exit
  })
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('GH_REPOSITORIES', 'secret-marker-invalid-json')
  onTestFinished(() => {
    exitSpy.mockRestore()
    errorSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  await expect(import('../src/server.js')).rejects.toBe(exit)
  expect(exitSpy).toHaveBeenCalledExactlyOnceWith(1)
  expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
    'GH_REPOSITORIES must be a nonempty owner/repo mapping with positive integer repositoryId and installationId',
  )
})
