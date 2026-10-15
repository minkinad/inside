# Database and employee public IDs

PostgreSQL stores employees, units, career events, posts/comments/reactions, celebrations, events, benefits, brand assets and audit records. Prisma migrations are in `packages/db/prisma/migrations`. Internal `Employee.id` remains a CUID primary key for existing foreign keys. Other entities keep their existing ID strategy.

`Employee.publicId` is a unique, required public locator such as `employee/10000000001`. Migration `20261015220000_employee_public_id` creates the non-cycling PostgreSQL sequence `employee_public_id_seq` with a start value of `10000000001`, backfills existing employees in join-date/internal-ID order, adds a format check and unique index, and rejects later updates to the field. The default invokes `nextval`; rolled-back inserts and deletions do not recycle sequence values. The API never accepts `publicId` on employee creation or update.

Apply after a verified backup: `pnpm db:migrate`. Existing employee rows and every internal foreign key stay in place. Run `pnpm test:public-id` first: it creates an isolated disposable database, populates pre-migration employees and a career relation, applies the migration, then tests backfill, 16 concurrent inserts, uniqueness, format, immutability and non-reuse. It never changes the configured application database.

For a production rollback, capture a consistent `pg_dump -Fc` backup before migration and test `pg_restore` into a separate database. If no writes occurred after migration, point the application at the restored database and deploy the preceding compatible code. If writes occurred, do not simply restore an old snapshot: reconcile new data and IDs first, or roll forward with a corrective migration. Keep the sequence state with the database backup; resetting it would risk reused IDs. Store backups outside the repository and outside ephemeral `/tmp` directories.

The demo seed is for an empty, non-production database. It refuses to run if application records exist and does not delete data. Use a fresh disposable database for demos and CI.
