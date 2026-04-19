import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fixes = [
    {
      oldUsername: "benreinneuro",
      newUsername: "dr.benrein",
      newUrl: "https://www.tiktok.com/@dr.benrein",
      displayName: "Dr. Ben Rein",
      followersCount: 753600,
      notes: "Stanford neuroscientist, 75M video views. Правильный хендл @dr.benrein (не benreinneuro). Книга 'Why Brains Need Friends' (2025).",
    },
    {
      oldUsername: "impulsebraintraining",
      newUsername: "impulse_games",
      newUrl: "https://www.tiktok.com/@impulse_games",
      displayName: "Impulse – Brain Training",
      notes: "Конкурент. Правильный хендл @impulse_games (не impulsebraintraining). Уже сделали Stroop Test вирусным.",
    },
    {
      oldUsername: "tizianabucec",
      newUsername: "tiiiziana",
      newUrl: "https://www.tiktok.com/@tiiiziana",
      displayName: "Tiziana (Anti-Brain-Rot)",
      notes: "Anti-brain-rot серия, ролик про dopamine addiction 2.9M просмотров. Правильный хендл @tiiiziana (не tizianabucec).",
    },
  ];

  for (const fix of fixes) {
    const account = await prisma.account.findFirst({
      where: { username: fix.oldUsername, platform: "tiktok" },
    });

    if (!account) {
      console.log(`  ⚠ Not found: ${fix.oldUsername}`);
      continue;
    }

    await prisma.account.update({
      where: { id: account.id },
      data: {
        username: fix.newUsername,
        url: fix.newUrl,
        displayName: fix.displayName,
        followersCount: fix.followersCount,
        scrapeStatus: "idle",
        notes: fix.notes,
      },
    });

    console.log(`  ✓ ${fix.oldUsername} → ${fix.newUsername}`);
  }

  console.log("\nDone!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
