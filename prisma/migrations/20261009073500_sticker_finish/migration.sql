-- AlterTable
ALTER TABLE "sticker" ADD COLUMN     "finish" TEXT NOT NULL DEFAULT 'none';

-- Finishes used to be stored as filters.
UPDATE "sticker" SET "finish" = 'gloss', "filter" = 'original' WHERE "filter" = 'glow';
UPDATE "sticker" SET "finish" = "filter", "filter" = 'original' WHERE "filter" IN ('glitter', 'hologram');

-- Retired filters fold into their closest remaining one.
UPDATE "sticker" SET "filter" = 'original' WHERE "filter" = 'cool';
UPDATE "sticker" SET "filter" = 'mono' WHERE "filter" = 'noir';
