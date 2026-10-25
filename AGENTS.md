# Public dashboard instructions

This repository and its Actions logs/inputs are public. Never add production
credentials, private IPs, raw system facts, internal paths or infrastructure
configuration. Collection belongs in the private platform-bakkeit repository.

- Use branches and reviewed PRs; never push implementation directly to main.
- Run workflows only on GitHub-hosted runners. Never use the mgmt runner here.
- Maintain a static site without runtime dependencies or a server backend.
- Render external data as text, validate its exact allowlisted contract, and keep
  unavailable/stale states explicit. Resource readings are not application health.
- Coordinate contract changes with the private collector; reject extra fields.
- Run npm test and npm run test:browser before PR creation. BakkeIT maintainers
  must also follow the code-review skill in the private ops workspace.
- Write documentation in English and dashboard labels in Norwegian.
