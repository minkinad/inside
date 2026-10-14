# Inside contributor instructions

## Project context

Inside is an employee experience portal, not a task tracker. The implemented areas are identity, people and career history, organization, community posts, celebrations, benefits, brand assets and administration. The monorepo uses Next.js, NestJS, Prisma/PostgreSQL, Redis and MinIO. Knowledge, services and notifications are planned modules, not implemented features.

## Architecture rules

- The API owns authorization, mutations and file access. The web app uses `apps/web/src/lib/api.ts` and never imports database or API internals.
- Keep PostgreSQL `Employee.id` internal for foreign keys. Public contracts and links use immutable `Employee.publicId` (`employee/` plus 11 digits). The database sequence generates it; clients cannot supply it.
- Keep domain behavior close to its owning controller/service. Avoid cross-domain imports and new shared abstractions until two real callers need them. Record deliberate contract changes in `docs/api/README.md` and the changelog.
- Use Prisma migrations for schema changes. Test data-preserving migrations against a copy of existing data and document a backup/restore path. Do not run the demo seed against a populated database.

## Development rules

- TypeScript remains strict. Validate request bodies and path parameters; avoid `any`, unchecked casts and hard-coded secrets.
- Return safe public DTOs. Do not expose password hashes, internal employee IDs, object keys or private celebration details to employees.
- Handle errors visibly and keep write plus audit record in one database transaction. Treat MinIO and PostgreSQL as separate systems and reconcile partial failures.
- Keep real behavior behind visible controls. Do not add dependencies or abstractions without a concrete use.

## UI/UX rules

- Follow `docs/design.md` and the existing Inside tokens. Preserve the editorial employee experience; avoid generic dashboard grids.
- Use labeled controls, keyboard-accessible dialogs, responsive layouts and loading/error/empty states. Check desktop and mobile in a browser after visual changes.
- Employees start with initials and upload their own photos. Do not seed portraits or avatar images.

## Testing rules

- For code changes run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
- For schema or employee ID changes also run `pnpm db:validate` and `pnpm test:public-id` with Docker running.
- For API, auth, upload or user-flow changes run Playwright E2E (`pnpm --filter web e2e`) with Docker services running. Add meaningful tests for changed behavior.
- Run `pnpm validate:repo` for configuration, import or environment changes. Never weaken checks to obtain a green result.

## Git and security rules

- Use Conventional Commits and small, reviewable changes. PR descriptions state behavior, tests, migration impact and UI evidence when relevant.
- Enforce RBAC on the server. Keep tokens in HttpOnly cookies in the web app; validate mutation origins. Do not log secrets or personal data. Keep `.env` out of Git and review file types, size, MIME and access controls.
- Report vulnerabilities through the private process in `SECURITY.md`; never publish exploit details in a public issue.
