# BakkeIT status

Static, public resource dashboard for mx and storage. Hosted on GitHub Pages at
`status.bakkeit.cloud` after domain setup. No production credentials or private
infrastructure configuration belong here. The repository is public by design.

The header and browser icon use the owner-provided dark BakkeIT B/cloud/lock logo
in `site/assets/bakkeit-logo.jpg`. The original image is preserved; CSS controls
its display size. The minimal dark theme follows its navy, cyan and lavender
palette, with solid panels and restrained resource indicators.

## Development

Use Node 24 or newer. No runtime dependencies or build framework are required. Playwright is a pinned
development dependency for browser tests.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run preview
```

The checked-in snapshot intentionally contains no real measurements. The page
shows unavailable states until a reviewed live snapshot is published. CPU is a
one-second average across all cores; RAM uses Linux available memory. Disk
percentages include space reserved from ordinary users. Data older than fifteen
minutes is marked stale. Resource measurements do not prove application health.

## Publishing

Changes go through branches and reviewed PRs. The `Publish public status` workflow
runs only on main using GitHub-hosted runners. Enable Pages with GitHub Actions as
its source. A main push or manual dispatch without a snapshot rebuilds the site
using the currently published measurements, keeping their original timestamps. If those
measurements cannot be fetched/validated, publishing fails instead of replacing
them with empty values. Old values remain visibly stale. Production collection
subsequently dispatches with the allowlisted JSON contract in `site/model.js`; measurements are included in the artifact, never Git
commits. Only `site/` is deployed, without private data, tests or collection code.

The GitHub App installed only on this repository needs Actions write permission
to dispatch the workflow. Its private key stays in the private infrastructure
repository. This public repository must never use the management runner. Public
workflow inputs and logs must be treated as public.

Configure the `github-pages` environment to allow deployments only from main.
Verify domain ownership with GitHub's TXT record before setting the domain, then
point the `status` CNAME to `bakkeit.github.io`, configure `status.bakkeit.cloud`
in Pages and enforce HTTPS when its certificate is ready. Do not create an A/AAAA
record pointing at a BakkeIT server. Remove the DNS record if Pages is retired.

The browser refreshes the published snapshot every minute using a unique query
parameter to avoid stale shared-cache responses; collection is scheduled
every five minutes. GitHub queues and Pages caching can delay visibility. If
collection or publishing stops, the last published snapshot ages visibly.

Infrastructure setup and the operator runbook live in the private
`platform-bakkeit` repository. The dashboard contains no monitoring history or
service availability claims.
