-- Saved print sheets. The browser keeps a copy for everyone; this table
-- is the copy a signed-in person keeps on their account.
CREATE TABLE "print_sheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paper" TEXT NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "stickerMm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_sheet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_sheet_userId_updatedAt_idx" ON "print_sheet"("userId", "updatedAt");

CREATE TABLE "print_sheet_item" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "stickerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "print_sheet_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_sheet_item_sheetId_sort_idx" ON "print_sheet_item"("sheetId", "sort");
CREATE INDEX "print_sheet_item_stickerId_idx" ON "print_sheet_item"("stickerId");

ALTER TABLE "print_sheet" ADD CONSTRAINT "print_sheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_sheet_item" ADD CONSTRAINT "print_sheet_item_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "print_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_sheet_item" ADD CONSTRAINT "print_sheet_item_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "sticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
