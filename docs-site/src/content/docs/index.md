---
title: GitHub token broker
---

The broker exchanges a pod's projected Kubernetes credential for a short-lived GitHub installation token scoped to its assigned repository and role. See the [token broker reference](https://github.com/flok-ai/flok/blob/main/architecture/reference/token-broker.md) for the design, or the [GitHub repository](https://github.com/flok-ai/github-broker) for the implementation.

The pod's `ai-native-sdlc/repository` annotation must match an `owner/repo` slug in the YAML allowlist. On Kubernetes, the broker loads the allowlist from the `github-broker-repos` ConfigMap at startup. Apply the updated ConfigMap and restart the deployment to pick up changes. See the [deployment instructions](https://github.com/flok-ai/github-broker#configuration-and-deployment) for the file format and commands.
