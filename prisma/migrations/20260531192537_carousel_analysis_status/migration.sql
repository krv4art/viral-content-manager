-- AlterTable
ALTER TABLE "Carousel" ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'idle';
