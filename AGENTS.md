# AGENTS.md

## Source imports

- Use Node package subpath imports such as `#src/token-exchange.types.js` for source modules in other directories. Use `./` relative imports for sibling files. Keep the `.js` extension in both forms.

## API documentation

- Route schemas must include `summary` and `description`; keep tags, request/response schemas and examples aligned with behavior.
- Run `npm run docs:build` before opening or updating a PR, alongside lint, typecheck and tests. Install docs dependencies with `npm ci --prefix docs-site`.
- The API reference is built from route schemas and published at <https://flok-ai.github.io/github-broker/>. Do not commit `docs-site/openapi.json` or serve docs from the broker.

## Shared instructions

Read and follow these alongside this repo’s project-specific instructions. Explicit project-specific exceptions override shared defaults; otherwise both apply.

- [Working practices](./.agents/shared/working-practices.md)
- [Communication and writing](./.agents/shared/communication.md)
- [Cross-session memory](./.agents/shared/memory.md)
- [Git & GitHub workflow](./.agents/shared/github-workflow.md)
