# Checks and tests

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm validate:repo
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
```

Start Docker Compose before database and browser checks. `pnpm test:public-id` creates and removes its own database and verifies migration/backfill and concurrent ID allocation. `pnpm --filter web e2e` runs the key employee/admin/browser journeys against a fresh demo database in CI. The local E2E test writes a post, event and avatar; use disposable test data or a dedicated database.

For local Playwright without a downloaded browser, run `pnpm --filter web exec playwright install chromium`. A custom Chromium binary can be set with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Browser review is required after UI changes at desktop and mobile widths; `docs/design.md` records the current visual baseline.

`pnpm audit --audit-level high` queries the npm advisory registry and requires network access. Review its findings before a release. CodeQL runs on GitHub after workflows are pushed; a YAML file alone is not scan evidence.
