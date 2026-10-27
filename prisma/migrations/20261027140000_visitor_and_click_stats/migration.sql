-- Click-throughs to the sticker's website, once per visitor per day.
ALTER TABLE "sticker" ADD COLUMN "clicks" INTEGER NOT NULL DEFAULT 0;

-- Unique visitors per day; the lifetime total is the sum.
CREATE TABLE "site_daily_stat" (
    "day" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "site_daily_stat_pkey" PRIMARY KEY ("day")
);

-- Today's hashed visitors, for de-duplication. Pruned after a day.
CREATE TABLE "site_visitor" (
    "day" DATE NOT NULL,
    "visitor" TEXT NOT NULL,

    CONSTRAINT "site_visitor_pkey" PRIMARY KEY ("day", "visitor")
);

-- Today's hashed clickers per sticker, for de-duplication. Pruned after a day.
CREATE TABLE "sticker_click" (
    "stickerId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visitor" TEXT NOT NULL,

    CONSTRAINT "sticker_click_pkey" PRIMARY KEY ("stickerId", "day", "visitor")
);

CREATE INDEX "sticker_click_day_idx" ON "sticker_click"("day");

ALTER TABLE "sticker_click" ADD CONSTRAINT "sticker_click_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "sticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
