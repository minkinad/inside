# Contributing to Inside

Start with `README.md`, then read `docs/architecture/overview.md`, `docs/design.md` and `AGENTS.md`. Keep changes focused on an employee journey or one engineering concern. Describe the trigger and behavior change in the PR, including migration/rollback impact when data changes.

Use Node 24 and pnpm 10.34.4. `docs/development/setup.md` has the local setup. Run the checks in `docs/development/testing.md` for the area you changed. The demo seed only runs on an empty local database; never use it to refresh a database with employee data.

Use a Conventional Commit title such as `fix(people): use public employee IDs`. The PR template asks for tests, breaking changes and visual evidence when UI changes. Do not include secrets, private employee information or vulnerability details in a public PR; follow `SECURITY.md` for security reports.
