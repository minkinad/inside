# Development conventions

The API is the authorization boundary. Validate all request bodies and path parameters with Zod; use narrow Prisma selects/omits so internal employee IDs and secrets do not escape into employee-facing JSON. Prefer domain-level functions over generic frameworks. Database changes belong in an additive Prisma migration with a data-preserving test and recovery note.

The frontend uses `apps/web/src/lib/api.ts` for requests and public types, TanStack Query for server state, and existing Inside components/tokens for presentation. UI mutations show errors and preserve keyboard/focus behavior. Use links for navigation and buttons for actions. Keep mobile navigation complete and avatars user-supplied.

Format with Biome and keep TypeScript strict. Conventional Commit titles are required for PRs, for example `fix(identity): reject cross-origin writes`. Do not add a package for functionality available in the current stack without explaining the need. Never commit `.env`, test reports, local dumps or employee data.
