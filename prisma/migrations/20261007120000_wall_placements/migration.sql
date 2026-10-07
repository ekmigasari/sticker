-- CreateTable
CREATE TABLE "placement" (
    "id" TEXT NOT NULL,
    "stickerId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "unitsW" INTEGER NOT NULL,
    "unitsH" INTEGER NOT NULL,
    "zIndex" SERIAL NOT NULL,
    "stickerScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visibleShare" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "coveredBy" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placement_zIndex_key" ON "placement"("zIndex");

-- CreateIndex
CREATE INDEX "placement_stickerId_idx" ON "placement"("stickerId");

-- CreateIndex
CREATE INDEX "placement_visibleShare_idx" ON "placement"("visibleShare");

-- CreateIndex
CREATE INDEX "placement_x_y_idx" ON "placement"("x", "y");

-- AddForeignKey
ALTER TABLE "placement" ADD CONSTRAINT "placement_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "sticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

