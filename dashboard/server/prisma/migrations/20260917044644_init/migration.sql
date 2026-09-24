-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "focus" TEXT,
    "githubLogin" TEXT,
    "email" TEXT,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "developerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "DevUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "devUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "status" TEXT,
    "client" TEXT,
    "owner" TEXT,
    "activeDeveloper" TEXT,
    "lifecycle" TEXT,
    "summary" TEXT,
    "repositories" JSONB NOT NULL DEFAULT '[]',
    "lastConfirmed" TEXT,
    "nextStep" TEXT,
    "nextWhy" TEXT,
    "risks" JSONB NOT NULL DEFAULT '[]',
    "release" JSONB,
    "meeting" JSONB,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectLabel" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT,
    "url" TEXT,
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectLabel" TEXT,
    "status" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "source" TEXT,
    "due" TEXT,
    "createdAtSrc" TIMESTAMP(3),
    "updatedAtSrc" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubCommit" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "project" TEXT,
    "origin" TEXT NOT NULL,
    "authorLogin" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubPullRequest" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "repository" TEXT NOT NULL,
    "title" TEXT,
    "authorLogin" TEXT,
    "updatedAt" TIMESTAMP(3),
    "url" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubPullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaneWorkItem" (
    "id" TEXT NOT NULL,
    "identifier" TEXT,
    "name" TEXT,
    "state" TEXT,
    "priority" TEXT,
    "assignees" JSONB NOT NULL DEFAULT '[]',
    "targetDate" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "url" TEXT,
    "project" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaneWorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevUser_email_key" ON "DevUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DevUser_developerId_key" ON "DevUser"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Activity_developerId_timestamp_idx" ON "Activity"("developerId", "timestamp");

-- CreateIndex
CREATE INDEX "Action_developerId_idx" ON "Action"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubCommit_sha_repository_key" ON "GithubCommit"("sha", "repository");

-- CreateIndex
CREATE UNIQUE INDEX "GithubPullRequest_number_repository_key" ON "GithubPullRequest"("number", "repository");

-- CreateIndex
CREATE INDEX "SyncRun_source_refreshedAt_idx" ON "SyncRun"("source", "refreshedAt");

-- AddForeignKey
ALTER TABLE "DevUser" ADD CONSTRAINT "DevUser_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_devUserId_fkey" FOREIGN KEY ("devUserId") REFERENCES "DevUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
