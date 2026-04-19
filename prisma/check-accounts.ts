import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = await prisma.account.findMany({
    select: { id: true, username: true, platform: true, scrapeStatus: true, url: true },
    orderBy: { scrapeStatus: "asc" },
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
