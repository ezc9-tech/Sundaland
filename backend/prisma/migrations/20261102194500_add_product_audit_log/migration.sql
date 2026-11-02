CREATE TABLE "ProductAuditLog" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorRole" TEXT NOT NULL,
    "previousData" JSONB,
    "currentData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAuditLog_productId_createdAt_idx"
    ON "ProductAuditLog"("productId", "createdAt");
CREATE INDEX "ProductAuditLog_createdAt_idx"
    ON "ProductAuditLog"("createdAt");

ALTER TABLE "ProductAuditLog"
    ADD CONSTRAINT "ProductAuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
