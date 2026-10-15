-- Data-only rename. Upload the replacement demo brand objects before applying.
-- The temporary function disappears when this psql session ends.
BEGIN;

CREATE FUNCTION pg_temp.rebrand_text(value text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    regexp_replace(value, '@northstar[.]example', '@min.ex', 'gi'),
    'northstar|min:inside', 'min.Inside', 'gi'
  );
$$;

UPDATE "Employee" SET
  email = regexp_replace(email, '@northstar[.]example$', '@min.ex', 'i'),
  name = pg_temp.rebrand_text(name),
  title = pg_temp.rebrand_text(title),
  team = pg_temp.rebrand_text(team),
  location = pg_temp.rebrand_text(location),
  bio = pg_temp.rebrand_text(bio)
WHERE email ~* 'northstar' OR name ~* 'northstar|min:inside'
  OR title ~* 'northstar|min:inside' OR team ~* 'northstar|min:inside'
  OR location ~* 'northstar|min:inside' OR bio ~* 'northstar|min:inside';

UPDATE "Unit" SET
  name = pg_temp.rebrand_text(name),
  description = pg_temp.rebrand_text(description)
WHERE name ~* 'northstar|min:inside' OR description ~* 'northstar|min:inside';

UPDATE "CareerEvent" SET
  title = pg_temp.rebrand_text(title),
  detail = pg_temp.rebrand_text(detail)
WHERE title ~* 'northstar|min:inside' OR detail ~* 'northstar|min:inside';

UPDATE "Post" SET
  title = pg_temp.rebrand_text(replace(title, 'Встречайте новый Inside', 'Встречайте новый min.Inside')),
  body = pg_temp.rebrand_text(body)
WHERE title ~* 'northstar|min:inside' OR title = 'Встречайте новый Inside'
  OR body ~* 'northstar|min:inside';

UPDATE "Comment" SET body = pg_temp.rebrand_text(body)
WHERE body ~* 'northstar|min:inside';

UPDATE "Celebration" SET title = pg_temp.rebrand_text(title)
WHERE title ~* 'northstar|min:inside';

UPDATE "Event" SET
  title = pg_temp.rebrand_text(CASE
    WHEN title LIKE '%min.Inside Talks%' THEN title
    ELSE replace(title, 'Inside Talks', 'min.Inside Talks') END),
  description = pg_temp.rebrand_text(description),
  location = pg_temp.rebrand_text(location)
WHERE title ~* 'northstar|min:inside'
  OR (title LIKE '%Inside Talks%' AND title NOT LIKE '%min.Inside Talks%')
  OR description ~* 'northstar|min:inside' OR location ~* 'northstar|min:inside';

UPDATE "Benefit" SET
  category = pg_temp.rebrand_text(category),
  title = pg_temp.rebrand_text(title),
  description = pg_temp.rebrand_text(description),
  eligibility = pg_temp.rebrand_text(eligibility),
  instruction = pg_temp.rebrand_text(instruction),
  contact = pg_temp.rebrand_text(contact)
WHERE category ~* 'northstar|min:inside' OR title ~* 'northstar|min:inside'
  OR description ~* 'northstar|min:inside' OR eligibility ~* 'northstar|min:inside'
  OR instruction ~* 'northstar|min:inside' OR contact ~* 'northstar|min:inside';

UPDATE "BrandAsset" SET
  category = pg_temp.rebrand_text(category),
  title = pg_temp.rebrand_text(title),
  description = pg_temp.rebrand_text(description),
  usage = pg_temp.rebrand_text(usage),
  "objectKey" = CASE WHEN "objectKey" = 'demo/northstar-mark.svg'
    THEN 'demo/min-inside-mark.webp' ELSE "objectKey" END,
  "mimeType" = CASE WHEN "objectKey" = 'demo/northstar-mark.svg'
    THEN 'image/webp' ELSE "mimeType" END,
  size = CASE
    WHEN "objectKey" = 'demo/northstar-mark.svg' THEN 16688
    WHEN "objectKey" = 'demo/meeting-background.svg' THEN 708
    ELSE size END
WHERE category ~* 'northstar|min:inside' OR title ~* 'northstar|min:inside'
  OR description ~* 'northstar|min:inside' OR usage ~* 'northstar|min:inside'
  OR "objectKey" IN ('demo/northstar-mark.svg', 'demo/meeting-background.svg');

COMMIT;
