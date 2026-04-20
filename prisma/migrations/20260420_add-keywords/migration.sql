CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "cluster" TEXT,
    "type" TEXT NOT NULL DEFAULT 'search',
    "platform" TEXT NOT NULL DEFAULT 'tiktok',
    "volume" TEXT NOT NULL DEFAULT 'unknown',
    "intent" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isCovered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Keyword_projectId_phrase_key" ON "Keyword"("projectId", "phrase");
