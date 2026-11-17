CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorRole" TEXT NOT NULL,
    "subjectId" INTEGER,
    "subjectName" TEXT,
    "subjectEmail" TEXT,
    "subjectRole" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityLog_createdAt_idx"
    ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_actorId_createdAt_idx"
    ON "ActivityLog"("actorId", "createdAt");
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx"
    ON "ActivityLog"("entityType", "entityId", "createdAt");

ALTER TABLE "ActivityLog"
    ADD CONSTRAINT "ActivityLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
