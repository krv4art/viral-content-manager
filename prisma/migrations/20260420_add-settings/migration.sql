-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "scrapecreatorsApiKey" TEXT,
    "geminiApiKey" TEXT,
    "runwareApiKey" TEXT,
    "autoScrapeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAutoScrapeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
