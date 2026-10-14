# Security policy

## Supported versions

Inside is currently a pre-release project. Security fixes are maintained on `main`; there is no supported release series or historical security-fix commitment yet.

| Version | Security fixes |
| --- | --- |
| `main` (pre-release) | Yes |
| Older snapshots and forks | No commitment |

## Reporting a vulnerability

Do not publish vulnerability details, credentials or employee data in Issues, Discussions or pull requests. Use [GitHub Private Vulnerability Reporting](https://github.com/minkinad/inside/security/advisories/new) if it is enabled for this repository. If it is unavailable, contact a maintainer through an established private channel before sharing details. No dedicated security email address has been published.

Include a concise impact statement, affected version or commit, reproduction steps, and a suggested mitigation if known. Remove real personal data and secrets from the report.

## Response process and disclosure

Maintainers will acknowledge a private report when a secure channel is available, assess impact and reproducibility, prepare a fix and tests, and coordinate disclosure with the reporter. No fixed response SLA is promised for this pre-release project. Public disclosure should wait until a fix or mitigation is available and affected operators have had a reasonable opportunity to act.

## Security best practices

- Deploy behind HTTPS; set a unique `JWT_SECRET` of at least 32 characters and unique database, Redis and MinIO credentials. Never use `.env.example` values outside local development.
- Limit API and MinIO network access. Keep the PostgreSQL and MinIO volumes backed up and test restoration. Do not run `pnpm db:seed` on a populated database.
- Keep role checks in the API, validate input, use the web proxy's HttpOnly cookie and origin checks, and review privacy fields before adding new responses.
- Uploads have size and MIME gates. Brand files download as attachments; treat SVG and office documents from administrators as untrusted files until a dedicated parser/sanitizer is introduced.
- Keep logs free of tokens, passwords and personal data. Rotate any credential accidentally disclosed.

## Dependency policy

Dependabot proposes weekly compatible dependency and GitHub Action updates. Major upgrades require separate review. Run `pnpm audit --audit-level high` before release and review CodeQL results; neither a dependency audit nor CodeQL replaces manual authorization and upload review. Enable Dependabot security updates and secret scanning in repository settings where available.
