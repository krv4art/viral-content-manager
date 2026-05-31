-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "glmApiKey",
ADD COLUMN     "groqApiKey" TEXT;
