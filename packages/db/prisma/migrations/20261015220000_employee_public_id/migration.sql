-- Internal Employee.id remains the primary key for all existing relationships.
-- Sequence values are never recycled, including when an insert is rolled back.
CREATE SEQUENCE "employee_public_id_seq"
  AS BIGINT START WITH 10000000001 MINVALUE 10000000001
  MAXVALUE 99999999999 NO CYCLE;

ALTER TABLE "Employee" ADD COLUMN "publicId" TEXT;

-- A deterministic order helps operators compare IDs after restoring a backup.
WITH ordered AS (
  SELECT "id" FROM "Employee" ORDER BY "joinedAt", "id"
), assigned AS (
  SELECT "id", 'employee/' || nextval('employee_public_id_seq')::text AS "publicId"
  FROM ordered
)
UPDATE "Employee" AS employee
SET "publicId" = assigned."publicId"
FROM assigned WHERE employee."id" = assigned."id";

ALTER TABLE "Employee"
  ALTER COLUMN "publicId" SET DEFAULT ('employee/' || nextval('employee_public_id_seq'::regclass)::text),
  ALTER COLUMN "publicId" SET NOT NULL,
  ADD CONSTRAINT "Employee_publicId_format" CHECK ("publicId" ~ '^employee/[0-9]{11}$');
CREATE UNIQUE INDEX "Employee_publicId_key" ON "Employee"("publicId");

-- Public IDs are immutable once created. The API never accepts this field.
CREATE FUNCTION employee_public_id_guard() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS DISTINCT FROM OLD."publicId" THEN
    RAISE EXCEPTION 'Employee publicId is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_public_id_guard_trigger
BEFORE UPDATE ON "Employee"
FOR EACH ROW EXECUTE FUNCTION employee_public_id_guard();
