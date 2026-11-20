# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-20

Relicensed for the move to [flok](https://github.com/flok-ai).

### Changed

- License changed from MIT to the GNU Affero General Public License v3.0 only (AGPL-3.0-only). Copies, modified versions and network deployments must keep the attribution in `NOTICE`. Versions up to and including 0.1.0 remain MIT.

### Added

- `NOTICE` with the attribution term, `REUSE.toml` and `CONTRIBUTING.md`.

## [0.1.0] - 2026-11-20

Initial release: just-in-time GitHub tokens for agent pods, scoped to the pod's role and one repository. Deployed and verified live on AKS on 2026-11-18.

### Added

- Fastify service bootstrap with TypeScript on Node 24 ([#1](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/1)).
- `POST /v1/github-token`: exchanges a pod's projected Kubernetes token for a GitHub installation token. Role comes from the ServiceAccount, repository from a pod annotation checked against an allowlist; callers cannot choose either ([#9](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/9)).
- Scoped token minting through the GitHub App: planner gets read-only access, coder can push and open pull requests; one repository per token ([#13](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/13)).
- Kubernetes adapters: TokenReview with a dedicated audience, and lookup of the bound pod ([#15](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/15)).
- Container image, Kubernetes manifests and CI publishing to the registry ([#16](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/16)).
- API reference site on GitHub Pages ([#11](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/11)).
- Live verification record: 9 of 9 checks passed in the cluster ([#17](https://github.com/julie-ng/ai-native-sdlc-github-broker/pull/17)).

### Security

- Upstream errors and tokens are never logged or returned; requests with a body or query string are rejected.

[0.2.0]: https://github.com/julie-ng/ai-native-sdlc-github-broker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/julie-ng/ai-native-sdlc-github-broker/releases/tag/v0.1.0
