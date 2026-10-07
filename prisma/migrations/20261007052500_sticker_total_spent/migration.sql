-- AlterTable
ALTER TABLE "sticker" ADD COLUMN     "totalSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "sticker_totalSpent_createdAt_idx" ON "sticker"("totalSpent" DESC, "createdAt");
