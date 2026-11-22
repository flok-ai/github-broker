import { buildApp } from './app.js'
import { createGitHubTokenIssuer } from './github-token-issuer.js'
import { createKubernetesAdapters } from './kubernetes-adapters.js'
import { createYamlRepoLookup } from './repos-config.js'

export async function startServer(env: NodeJS.ProcessEnv) {
  const repoLookup = await createYamlRepoLookup(env.GH_REPOS_CONFIG_PATH ?? './repos.flok.yaml')
  let kubernetes: ReturnType<typeof createKubernetesAdapters>
  try {
    kubernetes = createKubernetesAdapters(env)
  } catch {
    throw new Error('Invalid Kubernetes configuration: check KUBERNETES_API_URL and KUBERNETES_SERVICE_ACCOUNT_TOKEN_PATH')
  }
  const tokenIssuer = await createGitHubTokenIssuer(env)

  const app = buildApp({
    logger: {
      redact: ['req.headers.authorization'],
    },
  }, {
    ...kubernetes,
    tokenIssuer,
    repoLookup,
  })

  await app.listen({
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT || 3000),
  })
  return app
}
