-- AlterTable
ALTER TABLE "sticker" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "sticker_archivedAt_idx" ON "sticker"("archivedAt");
