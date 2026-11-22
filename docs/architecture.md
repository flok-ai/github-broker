# Architecture and decisions

Platform design: [broker architecture](https://github.com/flok-ai/flok/blob/main/architecture/reference/token-broker.md). This page records the component's current state and the decisions behind it.

## Current state

- Standalone Fastify API with one endpoint, `POST /v1/github-token`, plus `/healthz`. No UI.
- Policy lives in the route and depends only on injected functions (`TokenExchangeOptions` in `src/token-exchange.types.ts`). `startServer(env)` in `src/start-server.ts` wires the real Kubernetes adapters, the GitHub App issuer and the YAML repo allowlist (`repos.flok.yaml`, mounted from a ConfigMap) behind an async `repoLookup`.
- The pod annotation `flok-ai.com/repo: owner/repo` selects the repo. All flok Kubernetes keys use the `flok-ai.com/` prefix.
- Deployed to AKS and [verified live](./live-verification.md) on 2026-11-18.
- CI verifies pull requests and `main`, uploads coverage to Qlty and publishes the container image to ACR. The API reference is generated offline from route schemas and published to GitHub Pages.

## Open decisions

- Repo allowlist: the YAML file ([#23](https://github.com/flok-ai/github-broker/issues/23)) is a step towards database-backed repos managed in a UI; a Drizzle-backed lookup can replace it through `repoLookup`.
- Deferred: run/step/attempt labels on issued tokens, and production hardening.

## Decision log

| Date | Decision | Reasoning |
|---|---|---|
| 2026-11-22 | Rename the pod annotation `ai-native-sdlc/repository` to `flok-ai.com/repo` (#35), with no support for the old key | Use a domain flok controls as the prefix for all its Kubernetes keys, and `repo` to match the broker's naming since #23. A hard switch: nothing else consumes the key, and pods with the old key get `403`. Merge with the workflows change, then deploy the broker. |
| 2026-11-22 | Move the decision log and live verification from the README into `docs/` | Keep the README focused on what the component is, how it fits and how to use it; follow the platform-services `docs/` layout. |
| 2026-11-22 | Use a list of named repos keyed at runtime by slug (#23 review) | Display names make the file easier to scan as repos are added. Reject duplicate slugs to keep lookup unambiguous. |
| 2026-11-22 | Mount the YAML repo allowlist from a ConfigMap and load it through an async lookup (#23) | Keep allowlist edits separate from image builds and allow a database-backed lookup later. ConfigMap applies can bypass PR review. |
| 2026-11-21 | Publish Vitest V8 coverage to Qlty | Use a separate upload job so the test job runs with read-only permissions. |
| 2026-11-13 | Use GH_ for broker GitHub configuration variables | Align deployment configuration with the requested GitHub Actions variable names. |
| 2026-11-13 | Wire startup adapters and ship a container, CI publication and plain envsubst manifests (#14) | Preserve Kubernetes defaults, reject empty allowlists, and fail before listening with fixed diagnostics. Infrastructure and human-run live tests remain separate. |
| 2026-11-13 | Implement Kubernetes adapters with native fetch, startup-configured CA trust and per-call reads of the broker token file | Keep the two-call MVP dependency-free and observe projected-token updates without caching credentials. As clarified in [#8](https://github.com/flok-ai/github-broker/issues/8#issuecomment-6853981045), nonempty TokenReview status.error means unauthenticated (401); transport/HTTP failures remain dependency errors (503). |
| 2026-11-13 | Generate an API reference with Swagger 9, Astro and the default Starlight theme, per [#10](https://github.com/flok-ai/github-broker/issues/10) | Swagger 9 supports Fastify 5. Reuse the reference repo's pinned Astro/Starlight/OpenAPI renderer versions; omit its TypeDoc, Tailwind and component overrides. Keep generation offline and out of the broker runtime. |
| 2026-11-13 | Use `@octokit/auth-app` for App JWT signing and Node fetch for each installation-token request | Avoid hand-written signing and bypass the library's installation-token cache; each issuance sends explicit repository and permission scope. PKCS#1 keys are normalized to PKCS#8 in memory at startup. |
| 2026-11-13 | Adopt the platform-services ESLint formatting rules in `eslint.config.mjs` | Keep formatting consistent across services. Retain this Fastify service's TypeScript base; the source config's Nuxt wrapper and JSDoc rules for absent `server/utils` and `server/db` directories do not apply here. |
| 2026-11-13 | Implement the issue #6 MVP with injected functions and a server-side repository allowlist | Keep policy testable offline; real adapters and server wiring belong to separate issues. |
| 2026-11-13 | Implement the proposed permissions: planner `contents: read`, `issues: read`; coder `contents: write`, `pull_requests: write`, `issues: read`; no run, step or attempt labels | Planner reads and clones; coder opens its own PR. Workflow traceability waits for the workflow service. Proposed in [#6](https://github.com/flok-ai/github-broker/issues/6) and discussed with the human developer at a high level on 2026-11-13; not reviewed in detail. Open for confirmation in the [PR #9 review](https://github.com/flok-ai/github-broker/pull/9). |
| 2026-11-13 | Explicitly register route plugins under `src/routes/<version>/<resource>.<method>.ts` | Make URL and method visible in filenames while retaining native Fastify registration without autoload. Discussed with the human developer at a high level on 2026-11-13; not reviewed in detail. Keep this convention as requested in the [PR #9 review](https://github.com/flok-ai/github-broker/pull/9#discussion_r4563085759). |
| 2026-10-25 | Bootstrap a standalone Fastify application | Broker has no UI and remains separate from workflow/artifact services. |
| 2026-10-25 | Use TypeScript ES modules, Node 24 LTS and Vitest | Architect's PR review supersedes the initial JavaScript, Node 22 and Node test-runner defaults. |
| 2026-10-25 | Compile for production; use `tsx` for development | Type-check explicitly and test the compiled process that production will run. |
