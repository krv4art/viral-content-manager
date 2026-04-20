-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_projectId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "autoScrape" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "medianViews" INTEGER;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
