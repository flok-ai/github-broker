.PHONY: update-repos-config
update-repos-config:
	@bash -e -o pipefail -c '\
		set -a; source manifests/.env; set +a; \
		kubectl -n github-broker create configmap github-broker-repos \
			--from-file=repos.flok.yaml --dry-run=client -o yaml | kubectl apply -f -; \
		kubectl -n github-broker rollout restart deployment/github-broker; \
		kubectl -n github-broker rollout status deployment/github-broker --timeout=180s'
