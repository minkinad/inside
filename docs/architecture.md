# Product architecture

For the current engineering architecture and audit, see [overview](architecture/overview.md), [audit](architecture/audit.md) and [database](architecture/database.md). This page preserves the initial product map.

Inside is a modular monolith. The API owns identity, authorization, all data mutations and file access. The web app renders the employee experience and calls REST endpoints. PostgreSQL is the source of truth; Redis holds short lived rate limits. MinIO stores brand assets. No seeded data is bundled with a production build.

## Product map

- **Today:** personal greeting, editorial lead story, social feed, celebrations, events, new people and shortcuts.
- **People:** searchable directory, team filters, profiles and career history.
- **Organization:** navigable unit and person graph, with accessible list view.
- **Community:** posts, comments, reactions and moderation.
- **Culture:** celebrations and events with privacy controls.
- **Benefits:** eligibility-aware program directory.
- **Brand:** versioned assets with authorized uploads and downloads.
- **Admin:** content and people operations with audit records.

P1: knowledge, services, richer search, favorites and notifications. Their navigation can appear as a preview only when clearly marked unavailable; P0 routes must work.

## Security boundaries

Access tokens contain employee id and role. Every protected API endpoint validates the bearer token. Admin writes use role guards and create audit entries. User content is stored as plain text; the UI never renders it as HTML. Birthday year is never returned by the celebration API. Profile visibility and public celebration preferences are enforced server side. Brand files are private in MinIO and served through authorization checks with MIME and size limits.

## Data and API

The Prisma schema defines employees, career events, units, posts, comments, reactions, celebrations, events, benefits, brand assets and audit entries. `/api/auth`, `/api/home`, `/api/people`, `/api/org`, `/api/posts`, `/api/celebrations`, `/api/events`, `/api/benefits`, `/api/brand`, `/api/admin` align to product modules. Paginated list endpoints use `skip` and `take` limits. Seed data represents the fictional min.Inside company.
