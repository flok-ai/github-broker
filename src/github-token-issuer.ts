import { createPrivateKey, type KeyObject } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createAppAuth } from '@octokit/auth-app'
import type { TokenIssuer, TokenPermissions } from './token-exchange.types.js'
import { isPositiveSafeInteger, isRecord } from './validation.js'

type IssuerEnv = Partial<Pick<NodeJS.ProcessEnv, 'GH_APP_ID' | 'GH_APP_PRIVATE_KEY_PATH'>>
type AppAuth = ReturnType<typeof createAppAuth>

export class GitHubTokenIssuerError extends Error {
  constructor(message:
    | 'GH_APP_ID missing or not numeric'
    | 'GH_APP_PRIVATE_KEY_PATH missing'
    | 'Private key file unreadable'
    | 'Private key is invalid'
    | 'Private key is not RSA'
    | 'GitHub token issuance unavailable' = 'GitHub token issuance unavailable') {
    super(message)
    this.name = 'GitHubTokenIssuerError'
  }
}

const scopeKeys = [
  'contents',
  'issues',
  'pull_requests',
]

function hasOnlyScopeKeys(scope: TokenPermissions): boolean {
  return Object.keys(scope).every(key => scopeKeys.includes(key))
}

function hasPermittedGrants(scope: TokenPermissions): boolean {
  return ['read', 'write'].includes(scope.contents)
    && scope.issues === 'read'
    && (scope.pull_requests === undefined || scope.pull_requests === 'write')
}

function isPermittedScope(scope: TokenPermissions): boolean {
  return hasPermittedGrants(scope) && hasOnlyScopeKeys(scope)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isTokenResponse(value: unknown): value is {
  token: string
  expires_at: string
} {
  return isRecord(value) && isNonEmptyString(value.token) && isTimestamp(value.expires_at)
}

async function readPrivateKey(keyPath: string | undefined): Promise<KeyObject> {
  if (!keyPath) {
    throw new GitHubTokenIssuerError('GH_APP_PRIVATE_KEY_PATH missing')
  }
  let pem: string
  try {
    pem = await readFile(keyPath, 'utf8')
  } catch {
    throw new GitHubTokenIssuerError('Private key file unreadable')
  }
  let key: KeyObject
  try {
    key = createPrivateKey(pem)
  } catch {
    throw new GitHubTokenIssuerError('Private key is invalid')
  }
  if (key.asymmetricKeyType !== 'rsa') {
    throw new GitHubTokenIssuerError('Private key is not RSA')
  }
  return key
}

async function loadAppAuth(env: IssuerEnv): Promise<AppAuth> {
  const appId = env.GH_APP_ID
  if (!appId || !/^\d+$/.test(appId)) {
    throw new GitHubTokenIssuerError('GH_APP_ID missing or not numeric')
  }
  const key = await readPrivateKey(env.GH_APP_PRIVATE_KEY_PATH)
  // Node accepts GitHub's PKCS#1 PEM; export PKCS#8 for the auth library.
  return createAppAuth({
    appId,
    privateKey: key.export({
      type: 'pkcs8',
      format: 'pem',
    }).toString(),
  })
}

async function requestInstallationToken(auth: AppAuth, {
  repositoryId, installationId, permissions,
}: Parameters<TokenIssuer>[0]): ReturnType<TokenIssuer> {
  // Reject missing scope even for callers outside TypeScript; JSON must never
  // omit either field and silently inherit the installation's full grants.
  const scope = { ...permissions }
  if (!isPositiveSafeInteger(repositoryId) || !isPositiveSafeInteger(installationId) || !isPermittedScope(scope)) {
    throw new GitHubTokenIssuerError()
  }
  const { token: jwt } = await auth({ type: 'app' })
  // Use only App JWT authentication, never Octokit's installation-token API
  // or its cache. Every issuance makes a fresh, explicitly scoped request.
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2026-03-10',
      'user-agent': 'flok-github-broker',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      repository_ids: [repositoryId],
      permissions: scope,
    }),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new GitHubTokenIssuerError()
  }
  const result: unknown = await response.json()
  if (!isTokenResponse(result)) {
    throw new GitHubTokenIssuerError()
  }
  return {
    token: result.token,
    expiresAt: result.expires_at,
  }
}

// Call once during startup. Server wiring is deliberately separate from this adapter.
export async function createGitHubTokenIssuer(env: IssuerEnv = process.env): Promise<TokenIssuer> {
  let auth: AppAuth
  try {
    auth = await loadAppAuth(env)
  } catch (error) {
    // Preserve only our fixed startup reasons, never raw filesystem/crypto errors.
    throw error instanceof GitHubTokenIssuerError ? error : new GitHubTokenIssuerError()
  }
  return async (assignment) => {
    try {
      return await requestInstallationToken(auth, assignment)
    } catch {
      // No cause: upstream exceptions can contain credentials, headers or bodies.
      throw new GitHubTokenIssuerError()
    }
  }
}

