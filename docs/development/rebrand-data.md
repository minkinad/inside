# Existing data after the min.Inside rename

The application and the empty-database demo seed use `min.Inside` and `@min.ex`. Existing databases need the separate, data-only script at `packages/db/prisma/data-migrations/20261015_min_inside.sql`. It preserves row IDs and relationships. It changes employee email addresses, company and content text, and the demo brand asset metadata. Review other systems that use an employee's email as a login or notification address before applying it outside local development.

For local Docker Compose, first stop application writes and save a full PostgreSQL backup outside the repository. Download the two existing demo objects from the MinIO console at `http://localhost:9001`, preserving their object keys and content types. Keep these backups in durable storage outside `/tmp` for any shared environment.

```sh
docker exec portal-postgres-1 pg_dump -U inside -d inside -Fc > inside-before-rebrand.dump
pnpm exec dotenv -e .env -- pnpm --filter @inside/db exec tsx prisma/upload-rebrand-assets.ts
docker exec -i portal-postgres-1 psql -v ON_ERROR_STOP=1 -U inside -d inside < packages/db/prisma/data-migrations/20261015_min_inside.sql
```

Verify that employee addresses end in `@min.ex`, the company unit is `min.Inside`, and both brand material downloads work. Then remove the unreferenced old demo object:

```sh
pnpm exec dotenv -e .env -- pnpm --filter @inside/db exec tsx prisma/upload-rebrand-assets.ts --cleanup-old
```

This sequence was tested on a restored copy of the populated local database before applying it to the local database. The current local backup is `/tmp/min-inside-before-rebrand.dump`; copies of the two original MinIO objects are in `/tmp/min-inside-assets-backup`. Those temporary files are only for this workspace and should be moved to durable storage if needed later.

To roll back, stop application writes and restore the backup into a **new** database, then point the application at it:

```sh
docker exec portal-postgres-1 createdb -U inside inside_rollback
docker exec -i portal-postgres-1 pg_restore -U inside -d inside_rollback < inside-before-rebrand.dump
```

Restore the saved MinIO objects under their original keys using the MinIO console before restarting the application. If any writes happened after the backup, reconcile them first; restoring the snapshot directly would discard them. Do not run the demo seed on a populated database.
