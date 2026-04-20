-- Step 1: add nullable column
ALTER TABLE "Video" ADD COLUMN "projectId" TEXT;

-- Step 2: populate from account
UPDATE "Video" v
SET "projectId" = a."projectId"
FROM "Account" a
WHERE a.id = v."accountId";

-- Step 3: make NOT NULL
ALTER TABLE "Video" ALTER COLUMN "projectId" SET NOT NULL;

-- Step 4: add FK
ALTER TABLE "Video" ADD CONSTRAINT "Video_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;

-- Step 5: change accountId to nullable (drop NOT NULL)
ALTER TABLE "Video" ALTER COLUMN "accountId" DROP NOT NULL;

-- Step 6: drop old FK, add new with SET NULL
ALTER TABLE "Video" DROP CONSTRAINT "Video_accountId_fkey";
ALTER TABLE "Video" ADD CONSTRAINT "Video_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL;
