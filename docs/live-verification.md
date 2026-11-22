# Live verification

Human-run checks against the deployed broker. Automated tests are offline; see the [README](../README.md#development).

## 2026-11-18: AKS

Run by the human developer against the AKS cluster, from throwaway test pods in `agents`. Each pod had a projected token with audience `token-broker`, no PAT and no other GitHub credential. All nine checks passed.

| # | Check | Result |
|---|---|---|
| 1 | `planner` pod requests a token | `200`, `expiresAt` from GitHub |
| 2 | `planner` pushes a branch with it | Denied (`403`); the token sees only the assigned repository |
| 3 | `coder` pushes a branch with it | Succeeded; the token sees only the assigned repository |
| 4 | Pod without the repository annotation | `403 assignment_denied` |
| 5 | Pod with another ServiceAccount (`foreman`) | `403 assignment_denied` |
| 6 | Valid ServiceAccount token without the `token-broker` audience | `401 invalid_credential` |
| 7 | Query string | `400 invalid_request` |
| 8 | Body naming a repository | `400 invalid_request` |
| 9 | Tokens in the broker log | None |

The run also confirmed the cluster-side assumptions: AKS answers the TokenReview with `201`, bound tokens carry the pod name and UID in `user.extra`, and the broker trusts the cluster CA through `NODE_EXTRA_CA_CERTS`.

**Not covered:** the `503` paths for dependency failures (unit tests only), and a cross-repository denial with a second installed repository.
