-- Better Auth auth rate limits (sign-in, sign-up, password changes).
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- Fixed-window counters for uploads, sticker writes, and reports.
CREATE TABLE "api_rate_limit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_rate_limit_pkey" PRIMARY KEY ("key")
);

-- Content reports reviewed from /admin/reports.
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "stickerId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_status_createdAt_idx" ON "report"("status", "createdAt");
CREATE INDEX "report_reporterId_idx" ON "report"("reporterId");
CREATE INDEX "report_stickerId_idx" ON "report"("stickerId");

-- A person can have at most one open report on a sticker. Resolved rows stay for the admin record.
CREATE UNIQUE INDEX "report_one_open" ON "report"("stickerId", "reporterId") WHERE "status" = 'open';

ALTER TABLE "report" ADD CONSTRAINT "report_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "sticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
