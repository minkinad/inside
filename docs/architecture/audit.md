# Engineering audit — 2026-10-16

Scope: current monorepo source, Prisma schema and migrations, authentication and file paths, API responses, Next.js proxy, tests, CI, Git metadata and documentation. The repository had one initial Git commit and most application files were untracked at audit time, so no release history can be inferred.

| Priority | Finding and evidence | Status / action |
| --- | --- | --- |
| P0 | Employee CUIDs were used in `/people/:id` links, admin routes and API responses. Internal keys were exposed through post, comment, career and organization payloads. | Fixed with `Employee.publicId`, database sequence, backfill/check/unique/immutability, public routes/DTOs and browser coverage. Internal FKs remain unchanged. |
| P0 | Demo seed called `deleteMany` on every table before writing sample data. Running it on a populated database would erase records. | Fixed: seed rejects a nonempty database before any mutation. CI seeds a fresh database only. |
| P0 | Admin mutation and audit insert were separate, so an audit failure could leave an unrecorded change. | Fixed: all admin writes and brand metadata use `auditedWrite` in a Prisma transaction. Brand upload attempts MinIO cleanup if the transaction fails. |
| P1 | Login limiting counted only failed attempts, used an unnormalized email key and split `INCR`/`EXPIRE`; Redis failure allowed unlimited attempts. | Fixed: normalized account key, atomic Redis script, all attempts counted, login fails closed on Redis failure. |
| P1 | Cookie-backed Next.js mutation proxy had no origin validation. | Fixed: POST/PATCH/DELETE proxy and logout reject absent or foreign Origin; cookie remains HttpOnly, SameSite=Lax and Secure in production. |
| P1 | API and web lacked consistent security headers and production service-credential checks. | Fixed for common response headers and required production env values. Brand downloads are attachments with CSP sandbox and no-store. |
| P1 | The API has four broad controllers in one `routes.ts`; UI features remain concentrated in `views.tsx`. | Open: extract domain modules incrementally behind existing routes and tests. Avoid a wholesale rewrite. |
| P1 | Avatar/post files can be written to MinIO before their database update; failed updates leave orphan objects. Brand cleanup is best effort. | Open: add an outbox/reconciliation worker or delayed orphan scan; test MinIO failure paths. |
| P1 | Reaction endpoints use read-then-delete/create toggles. Simultaneous requests can race and return 500 or surprising state. | Open: replace with an explicit desired-state API or serialized per-user operation. |
| P1 | Upload checks use declared MIME plus signatures and a regex for SVG. This is not a complete file parser or SVG sanitizer. | Open: sanitize/normalize images and SVG or restrict accepted formats; keep private storage and attachment delivery. |
| P1 | The 2026-10-16 npm advisory check found high/critical transitive packages in Prisma tooling and Vitest, plus moderate advisories in MinIO dependencies and Swagger tooling. The older PostCSS pulled by Next.js was also affected. | PostCSS is overridden to 8.5.30 and the build passes. Remaining advisories need dependency updates and compatibility review before release; development-only tooling has lower runtime exposure. Track them through the private security process. |
| P2 | Home loads all birthday rows for a 30-day window; Org loads all employees and renders a full graph. Large companies will need server-side windowing/lazy loading. | Open: index/compute upcoming birthdays in SQL and virtualize or page the org graph. |
| P2 | `routes.ts` and `views.tsx` repeat query/response assembly and tightly couple domain flows. | Open: move shared selectors/DTOs only where reuse is real; split feature files with contract tests. |
| P2 | The app has no distributed tracing or shutdown lifecycle for Redis/Prisma. | Open: add lifecycle hooks and request correlation before a production rollout. |

No import cycles were found by the repository validator after the current changes. API tests, Playwright E2E and the isolated migration test provide coverage for the changed paths; broader integration coverage is still needed for uploads, privacy and reaction races. The npm advisory bulk endpoint was checked against the pinned lockfile; hosted CodeQL results remain unavailable until the workflow runs on GitHub. Configuration alone is not a completed scan.

## Next correction sequence

1. Extract Identity and People/Organization controllers/services, preserving routes and public DTOs.
2. Introduce safe media normalization and storage reconciliation; add failure-path integration tests.
3. Change reaction APIs to explicit state and make large-org queries/visualization incremental.
4. Add request correlation, lifecycle shutdown and production runbooks after the deployment shape is chosen.
