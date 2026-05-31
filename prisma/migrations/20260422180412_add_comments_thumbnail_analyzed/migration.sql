-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "audienceLanguage" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "commentsAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "objections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "painPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnailAnalyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbnailAnalyzedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "likesCount" INTEGER,
    "postedAt" TIMESTAMP(3),
    "language" TEXT,
    "sentiment" TEXT,
    "painPoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoComment_videoId_idx" ON "VideoComment"("videoId");

-- CreateIndex
CREATE INDEX "VideoComment_videoId_likesCount_idx" ON "VideoComment"("videoId", "likesCount");

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
