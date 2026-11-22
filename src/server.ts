import { startServer } from './start-server.js'

try {
  const app = await startServer(process.env)
  const shutdown = async () => {
    try {
      await app.close()
    } catch (error) {
      app.log.error(error)
      process.exitCode = 1
    }
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Server startup failed')
  process.exitCode = 1
}
