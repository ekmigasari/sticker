-- Flatten Product + child Sticker into a single sticker listing table.

-- 1) Build new sticker rows from products + latest child artwork
CREATE TABLE "sticker_listing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "offer" TEXT,
    "uploadId" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "filter" TEXT NOT NULL DEFAULT 'original',
    "outlineColor" TEXT NOT NULL,
    "outlineThickness" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sticker_listing_pkey" PRIMARY KEY ("id")
);

INSERT INTO "sticker_listing" (
  "id", "userId", "name", "oneLiner", "url", "category", "offer",
  "uploadId", "style", "filter", "outlineColor", "outlineThickness",
  "createdAt", "updatedAt"
)
SELECT
  p."id",
  p."userId",
  p."name",
  p."oneLiner",
  p."url",
  CASE p."category"
    WHEN 'Tool' THEN 'Developer Tools'
    WHEN 'App' THEN 'Mobile'
    WHEN 'Game' THEN 'Games'
    ELSE p."category"
  END,
  p."offer",
  s."uploadId",
  s."style",
  s."filter",
  s."outlineColor",
  s."outlineThickness",
  p."createdAt",
  p."updatedAt"
FROM "product" p
INNER JOIN LATERAL (
  SELECT *
  FROM "sticker" child
  WHERE child."productId" = p."id"
  ORDER BY child."createdAt" DESC
  LIMIT 1
) s ON true;

-- 2) Drop old sticker + product
DROP TABLE "sticker";
DROP TABLE "product";

-- 3) Rename listing table to sticker
ALTER TABLE "sticker_listing" RENAME TO "sticker";

-- 4) Indexes + FKs
CREATE INDEX "sticker_userId_idx" ON "sticker"("userId");
CREATE INDEX "sticker_category_idx" ON "sticker"("category");
CREATE INDEX "sticker_uploadId_idx" ON "sticker"("uploadId");

ALTER TABLE "sticker" ADD CONSTRAINT "sticker_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sticker" ADD CONSTRAINT "sticker_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
