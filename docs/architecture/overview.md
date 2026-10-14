# Architecture overview

Inside is one deployable API and one web application over a shared PostgreSQL database. The Next.js app owns navigation, presentation and session cookies. Its same-origin `/api/inside/*` proxy forwards requests to NestJS with a bearer token from an HttpOnly cookie. NestJS owns authorization, validation, business operations and file access. Prisma maps the PostgreSQL schema; Redis stores short-lived rate-limit counters; MinIO stores uploaded images and brand files.

The implemented backend controllers currently form four coarse boundaries: Identity (`AuthController`), employee and content reads/writes (`DataController`), Administration (`AdminController`) and Brand Assets (`BrandController`). They live in `apps/api/src/routes.ts`. This is a modular monolith at deployment and data ownership level, but its source boundaries are still coarse. The next refactor should extract People/Organization, Community, Celebrations and Benefits into their own controller/service files without changing routes or database ownership. Knowledge Base, Services and Notifications are future product modules and have no runtime implementation.

The web app's shared UI is in `apps/web/src/components/ui.tsx` and `dialog.tsx`; feature views are in `home-editorial.tsx`, `people-directory.tsx` and the older consolidated `views.tsx`. `apps/web/src/lib/api.ts` is the only API client and public response-type home. A future extraction can split `views.tsx` by feature after route-level tests guard behavior.

## Trust boundaries

Every protected API route uses a JWT guard that reloads the employee's current role from PostgreSQL. Admin writes use `AdminGuard`. Web mutations require a same-origin `Origin` header before the proxy forwards the token. Public employee IDs are locators only; they do not convey permissions. MinIO objects are private and downloaded through authenticated API routes.

## Persistence and failure modes

PostgreSQL is the source of truth. Admin data changes and audit records share a transaction. Brand upload writes MinIO first, then the database, and attempts object cleanup if the transaction fails. Avatar and post image uploads still need a reconciliation job for rare storage/database partial failures. Redis outages block login; social write throttles currently fail open to preserve availability. See `audit.md` for priorities.

## Contracts

`docs/api/README.md` lists the routes and the public employee ID contract. `docs/architecture/database.md` explains migration and recovery. Existing post, unit, event and asset IDs retain their original strategy.
