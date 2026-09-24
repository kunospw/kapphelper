-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "ActionCompletion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "developerId" TEXT,
    "completedBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "planeItemId" TEXT,
    "planeSynced" BOOLEAN NOT NULL DEFAULT false,
    "planeSyncedAt" TIMESTAMP(3),
    "planeError" TEXT,

    CONSTRAINT "ActionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionCompletion_key_key" ON "ActionCompletion"("key");

-- CreateIndex
CREATE INDEX "ActionCompletion_completedAt_idx" ON "ActionCompletion"("completedAt");
