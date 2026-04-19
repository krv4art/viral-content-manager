-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appStoreUrl" TEXT,
    "playStoreUrl" TEXT,
    "websiteUrl" TEXT,
    "productDoc" TEXT,
    "targetPlatforms" TEXT[],
    "targetRegions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "followersCount" INTEGER,
    "followingCount" INTEGER,
    "videosCount" INTEGER,
    "avgViews" INTEGER,
    "avgEngagementRate" DOUBLE PRECISION,
    "category" TEXT NOT NULL DEFAULT 'competitor',
    "tags" TEXT[],
    "notes" TEXT,
    "lastScrapedAt" TIMESTAMP(3),
    "scrapeStatus" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'video',
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "durationSeconds" INTEGER,
    "viewsCount" INTEGER,
    "likesCount" INTEGER,
    "commentsCount" INTEGER,
    "sharesCount" INTEGER,
    "savesCount" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "postedAt" TIMESTAMP(3),
    "hashtags" TEXT[],
    "musicName" TEXT,
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysis" JSONB,
    "hookText" TEXT,
    "hookVisual" TEXT,
    "fullScript" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hook" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoId" TEXT,
    "text" TEXT NOT NULL,
    "visualDescription" TEXT,
    "hookType" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "sourceViews" INTEGER,
    "sourceEr" DOUBLE PRECISION,
    "adaptedText" TEXT,
    "tags" TEXT[],
    "rating" INTEGER,
    "notes" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoId" TEXT,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "body" TEXT,
    "cta" TEXT,
    "fullText" TEXT,
    "format" TEXT,
    "durationSeconds" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "sourceViews" INTEGER,
    "adaptedVersion" TEXT,
    "tags" TEXT[],
    "rating" INTEGER,
    "notes" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "prototypeAccountId" TEXT,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "appearance" TEXT,
    "voiceAndSpeech" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "visualStyle" TEXT,
    "imageGenPrompt" TEXT,
    "referenceImages" TEXT[],
    "generatedImages" TEXT[],
    "topHooks" JSONB,
    "topScripts" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "type" TEXT NOT NULL,
    "platform" TEXT,
    "exampleUrls" TEXT[],
    "relevance" TEXT NOT NULL DEFAULT 'warm',
    "applicability" INTEGER,
    "adaptationNotes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT,
    "hookId" TEXT,
    "scriptId" TEXT,
    "creatorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "publicationUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "metrics" JSONB,
    "learnings" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT,
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_projectId_platform_username_key" ON "Account"("projectId", "platform", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Video_platform_videoId_key" ON "Video"("platform", "videoId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hook" ADD CONSTRAINT "Hook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hook" ADD CONSTRAINT "Hook_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_prototypeAccountId_fkey" FOREIGN KEY ("prototypeAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trend" ADD CONSTRAINT "Trend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
