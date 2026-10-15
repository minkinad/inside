#!/usr/bin/env bash
set -euo pipefail

# This test creates its own database and never mutates the configured app database.
test_db="inside_public_id_test_${RANDOM}_${RANDOM}"
db_url="postgresql://inside:inside@localhost:5432/${test_db}?schema=public"
cleanup() { docker compose exec -T postgres dropdb -U inside --if-exists "$test_db" >/dev/null; }
trap cleanup EXIT

docker compose exec -T postgres createdb -U inside "$test_db"
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U inside -d "$test_db" < packages/db/prisma/migrations/20261015190000_init/migration.sql >/dev/null
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U inside -d "$test_db" >/dev/null <<'SQL'
INSERT INTO "Unit" ("id", "name") VALUES ('unit-before-migration', 'Existing unit');
INSERT INTO "Employee" ("id", "email", "passwordHash", "name", "title", "team", "unitId", "location", "joinedAt")
VALUES
  ('internal-old-1', 'old1@example.test', 'hash', 'Older', 'Engineer', 'Team', 'unit-before-migration', 'Remote', '2020-01-01'),
  ('internal-old-2', 'old2@example.test', 'hash', 'Newer', 'Engineer', 'Team', 'unit-before-migration', 'Remote', '2021-01-01');
INSERT INTO "CareerEvent" ("id", "employeeId", "kind", "title", "date")
VALUES ('old-career', 'internal-old-1', 'JOINED', 'Joined', '2020-01-01');
SQL

DATABASE_URL="$db_url" pnpm -C packages/db exec prisma migrate resolve --applied 20261015190000_init >/dev/null
DATABASE_URL="$db_url" pnpm -C packages/db exec prisma migrate deploy >/dev/null

docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U inside -d "$test_db" >/dev/null <<'SQL'
DO $$
BEGIN
  IF (SELECT "publicId" FROM "Employee" WHERE "id" = 'internal-old-1') <> 'employee/10000000001'
     OR (SELECT "publicId" FROM "Employee" WHERE "id" = 'internal-old-2') <> 'employee/10000000002'
     OR (SELECT "employeeId" FROM "CareerEvent" WHERE "id" = 'old-career') <> 'internal-old-1' THEN
    RAISE EXCEPTION 'Backfill changed identity or broke an existing relation';
  END IF;
END $$;
SQL

# Separate psql processes exercise concurrent INSERTs against the same sequence.
for n in $(seq 1 16); do
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U inside -d "$test_db" -c \
    "INSERT INTO \"Employee\" (\"id\", \"email\", \"passwordHash\", \"name\", \"title\", \"team\", \"unitId\", \"location\", \"joinedAt\") VALUES ('internal-new-${n}', 'new${n}@example.test', 'hash', 'New', 'Engineer', 'Team', 'unit-before-migration', 'Remote', NOW())" >/dev/null &
done
wait

docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U inside -d "$test_db" >/dev/null <<'SQL'
DO $$
DECLARE deleted_id text;
BEGIN
  IF (SELECT count(*) FROM "Employee") <> 18
     OR (SELECT count(DISTINCT "publicId") FROM "Employee") <> 18
     OR EXISTS (SELECT 1 FROM "Employee" WHERE "publicId" !~ '^employee/[0-9]{11}$') THEN
    RAISE EXCEPTION 'Concurrent ID generation failed';
  END IF;
  SELECT "publicId" INTO deleted_id FROM "Employee" WHERE "id" = 'internal-new-1';
  DELETE FROM "Employee" WHERE "id" = 'internal-new-1';
  INSERT INTO "Employee" ("id", "email", "passwordHash", "name", "title", "team", "unitId", "location", "joinedAt")
  VALUES ('internal-replacement', 'replacement@example.test', 'hash', 'Replacement', 'Engineer', 'Team', 'unit-before-migration', 'Remote', NOW());
  IF (SELECT "publicId" FROM "Employee" WHERE "id" = 'internal-replacement') = deleted_id THEN
    RAISE EXCEPTION 'A deleted public ID was reused';
  END IF;
  BEGIN
    UPDATE "Employee" SET "publicId" = 'employee/99999999999' WHERE "id" = 'internal-replacement';
    RAISE EXCEPTION 'Public ID was mutable';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Employee publicId is immutable' THEN RAISE; END IF;
  END;
END $$;
SQL

echo 'Employee public ID migration, concurrency, uniqueness and immutability passed.'
