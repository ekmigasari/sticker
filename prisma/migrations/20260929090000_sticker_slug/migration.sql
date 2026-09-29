-- AlterTable
ALTER TABLE "sticker" ADD COLUMN "slug" TEXT;

-- Backfill unique slugs from name + short id suffix
UPDATE "sticker"
SET "slug" = trim(
  both '-'
  from lower(
    regexp_replace(
      regexp_replace(coalesce(nullif(trim("name"), ''), 'sticker'), '[^a-zA-Z0-9]+', '-', 'g'),
      '-{2,}',
      '-',
      'g'
    )
  )
) || '-' || left(replace("id", '-', ''), 8);

UPDATE "sticker"
SET "slug" = 'sticker-' || left(replace("id", '-', ''), 8)
WHERE "slug" IS NULL OR "slug" = '' OR "slug" LIKE '-%';

ALTER TABLE "sticker" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "sticker_slug_key" ON "sticker"("slug");
