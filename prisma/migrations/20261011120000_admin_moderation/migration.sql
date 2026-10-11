-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" TEXT DEFAULT 'user',
ADD COLUMN     "banned" BOOLEAN DEFAULT false,
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banExpires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "impersonatedBy" TEXT;

-- AlterTable
ALTER TABLE "sticker" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenReason" TEXT;

-- CreateIndex
CREATE INDEX "sticker_hiddenAt_idx" ON "sticker"("hiddenAt");
