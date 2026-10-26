-- Each copy on a paper has its own place and size.
ALTER TABLE "print_sheet_item" ADD COLUMN "xMm" DOUBLE PRECISION;
ALTER TABLE "print_sheet_item" ADD COLUMN "yMm" DOUBLE PRECISION;
ALTER TABLE "print_sheet_item" ADD COLUMN "wMm" DOUBLE PRECISION;
ALTER TABLE "print_sheet_item" ADD COLUMN "hMm" DOUBLE PRECISION;

UPDATE "print_sheet_item"
SET "xMm" = 10, "yMm" = 10, "wMm" = 50, "hMm" = 50
WHERE "xMm" IS NULL;

ALTER TABLE "print_sheet_item" ALTER COLUMN "xMm" SET NOT NULL;
ALTER TABLE "print_sheet_item" ALTER COLUMN "yMm" SET NOT NULL;
ALTER TABLE "print_sheet_item" ALTER COLUMN "wMm" SET NOT NULL;
ALTER TABLE "print_sheet_item" ALTER COLUMN "hMm" SET NOT NULL;

ALTER TABLE "print_sheet_item" DROP COLUMN "quantity";
