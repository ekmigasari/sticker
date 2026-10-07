-- AlterTable
ALTER TABLE "sticker" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "sticker" RENAME CONSTRAINT "sticker_listing_pkey" TO "sticker_pkey";
