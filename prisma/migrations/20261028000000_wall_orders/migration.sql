-- CreateTable
CREATE TABLE "wall_order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "intent" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "checkoutId" TEXT,
    "paymentId" TEXT,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wall_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wall_order_checkoutId_key" ON "wall_order"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "wall_order_paymentId_key" ON "wall_order"("paymentId");

-- CreateIndex
CREATE INDEX "wall_order_userId_idx" ON "wall_order"("userId");

-- AddForeignKey
ALTER TABLE "wall_order" ADD CONSTRAINT "wall_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

