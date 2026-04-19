import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = "brainura-default";

async function main() {
  // ─── DONOR ACCOUNTS ────────────────────────────────────────────────────────

  const donorAccounts = [
    // Группа 1: Нейронаука и здоровье мозга
    {
      username: "drrachelbarr",
      displayName: "Dr. Rachel Barr",
      url: "https://www.tiktok.com/@drrachelbarr",
      followersCount: 774000,
      category: "donor",
      tags: ["neuroscience", "brain-health", "science-comms", "group-1-neuro"],
      notes: "PhD нейробиолог, автор 'Make Your Brain Your Best Friend'. Форматы: память, фокус, экраны. Главный образец для Brainura по научной подаче.",
    },
    {
      username: "emonthebrain",
      displayName: "Emily (Emon the Brain)",
      url: "https://www.tiktok.com/@emonthebrain",
      followersCount: 753000,
      category: "donor",
      tags: ["neuroscience", "brain-health", "health-coach", "group-1-neuro"],
      notes: "Нейробиолог + health coach. Brain hacks, mental wellness — прямое попадание в ЦА Ryan/Sarah. Изучить формат коротких brain tips.",
    },
    {
      username: "benreinneuro",
      displayName: "Ben Rein (Neuroscientist)",
      url: "https://www.tiktok.com/@benreinneuro",
      followersCount: 700000,
      category: "donor",
      tags: ["neuroscience", "viral", "science-comms", "group-1-neuro"],
      notes: "Нейробиолог, вирусный ролик 6.4M просмотров. Простые объяснения науки мозга. Изучить почему именно его видео взрывается.",
    },
    {
      username: "drjulie",
      displayName: "Dr. Julie Smith",
      url: "https://www.tiktok.com/@drjulie",
      followersCount: 4900000,
      category: "donor",
      tags: ["psychology", "mental-health", "brain-health", "group-1-neuro"],
      notes: "4.9M подписчиков. Психолог-терапевт, форматы 'how your brain works'. Смотреть на хуки и подачу, аудитория совпадает.",
    },
    {
      username: "dr.noc",
      displayName: "Dr. Noc",
      url: "https://www.tiktok.com/@dr.noc",
      followersCount: 3500000,
      category: "donor",
      tags: ["science-comms", "brain-health", "debunking", "group-1-neuro"],
      notes: "3.5M подписчиков. Science communicator, антимиф-контент про здоровье мозга. Высокий охват, изучить формулу вирального научпопа.",
    },
    // Группа 2: Биохакинг
    {
      username: "hubermanlab",
      displayName: "Andrew Huberman",
      url: "https://www.tiktok.com/@hubermanlab",
      category: "donor",
      tags: ["biohacking", "neuroscience", "protocols", "group-2-biohack"],
      notes: "ГЛАВНЫЙ ориентир. Весь язык Brainura ('protocol', 'evidence-based') отсюда. Мониторить каждый день — форматы, хуки, реакции аудитории.",
    },
    {
      username: "garybrecka",
      displayName: "Gary Brecka",
      url: "https://www.tiktok.com/@garybrecka",
      category: "donor",
      tags: ["biohacking", "human-optimization", "group-2-biohack"],
      notes: "Human biologist, 'Ultimate Human Podcast'. Тренды в когнитивной оптимизации. Формат 'human upgrade' — адаптировать для brain training.",
    },
    {
      username: "femalelongevity",
      displayName: "Kayla Barnes-Lentz",
      url: "https://www.tiktok.com/@femalelongevity",
      followersCount: 200000,
      category: "donor",
      tags: ["biohacking", "brain-health", "female-audience", "group-2-biohack"],
      notes: "Brain health coach, нейровоспаление, longevity. Основной донор для аудитории 'Sarah' (VP People, 35-45). Следить за женскими форматами.",
    },
    {
      username: "daveasprey",
      displayName: "Dave Asprey",
      url: "https://www.tiktok.com/@daveasprey",
      followersCount: 263000,
      category: "donor",
      tags: ["biohacking", "nootropics", "bulletproof", "group-2-biohack"],
      notes: "Bulletproof founder. Когнитивный стек, ноотропы. Классика биохак-дискурса, изучить какие темы про мозг получают максимум ER.",
    },
    {
      username: "biohacking_tlv",
      displayName: "Ram Shechter",
      url: "https://www.tiktok.com/@biohacking_tlv",
      followersCount: 34200,
      category: "donor",
      tags: ["biohacking", "longevity", "micro", "group-2-biohack"],
      notes: "Longevity coach, 34K подписчиков. Нишевый но качественный — изучить идеи, которые ещё не mainstream.",
    },
    // Группа 3: Anti-Brain-Rot
    {
      username: "tizianabucec",
      displayName: "Tiziana Bucec",
      url: "https://www.tiktok.com/@tizianabucec",
      category: "donor",
      tags: ["anti-brain-rot", "dopamine", "digital-detox", "group-3-antibrain"],
      notes: "Anti-brain-rot серия. Ролик про dopamine addiction — 2.9M просмотров. Изучить ФОРМАТ: структуру, хук, длину. Это наш главный нарратив.",
    },
    // Группа 4: Конкуренты
    {
      username: "lumosity",
      displayName: "Lumosity",
      url: "https://www.tiktok.com/@lumosity",
      category: "competitor",
      tags: ["brain-training", "competitor", "direct"],
      notes: "Главный конкурент, 100M+ пользователей. Несёт FTC-скандал. Мониторить форматы, которые получают реакции, и брать лучшее.",
    },
    {
      username: "elevateapp",
      displayName: "Elevate",
      url: "https://www.tiktok.com/@elevateapp",
      category: "competitor",
      tags: ["brain-training", "competitor", "design-award"],
      notes: "Apple Design Award winner. Смотреть на визуальный стиль и подачу. Их слабость — нет morning routine угла.",
    },
    {
      username: "impulsebraintraining",
      displayName: "Impulse Brain Training",
      url: "https://www.tiktok.com/@impulsebraintraining",
      category: "competitor",
      tags: ["brain-training", "competitor", "stroop-test"],
      notes: "Уже сделали Stroop Test вирусным — изучить их формат 'can you beat this?' детально. Прямой конкурент по механике видео.",
    },
  ];

  console.log("Adding donor and competitor accounts...");
  for (const acc of donorAccounts) {
    await prisma.account.upsert({
      where: {
        projectId_platform_username: {
          projectId: PROJECT_ID,
          platform: "tiktok",
          username: acc.username,
        },
      },
      update: {
        displayName: acc.displayName,
        followersCount: acc.followersCount,
        category: acc.category,
        tags: acc.tags,
        notes: acc.notes,
      },
      create: {
        projectId: PROJECT_ID,
        platform: "tiktok",
        username: acc.username,
        url: acc.url,
        displayName: acc.displayName,
        followersCount: acc.followersCount,
        category: acc.category,
        tags: acc.tags,
        notes: acc.notes,
      },
    });
    console.log(`  ✓ ${acc.username} (${acc.category})`);
  }

  // ─── KNOWLEDGE ARTICLES ────────────────────────────────────────────────────

  const knowledgeArticles = [
    {
      title: "TikTok Donor Accounts — Brainura (апрель 2026)",
      category: "research",
      source: "Исследование TikTok + веб-поиск, апрель 2026",
      isPinned: true,
      tags: ["tiktok", "donors", "accounts", "monitoring", "biohacking", "neuroscience"],
      content: `# TikTok Аккаунты-доноры для Brainura

## Группа 1: Нейронаука и здоровье мозга
*Самые прямые доноры — их аудитория = наша аудитория*

| Аккаунт | Подписчики | Зачем смотреть |
|---|---|---|
| @drrachelbarr | ~774K | PhD нейробиолог; форматы про память, фокус, экраны |
| @emonthebrain | ~753K | Нейробиолог + health coach; brain hacks, mental wellness |
| @benreinneuro | ~700K+ | Вирусный ролик 6.4M; простые объяснения науки мозга |
| @drjulie | ~4.9M | Психолог, 'how your brain works' — изучить хуки |
| @dr.noc | ~3.5M | Science communicator, антимиф-контент — формула научпопа |

## Группа 2: Биохакинг и оптимизация
*Аудитория Ryan (34-45, PM/engineer) — именно здесь*

| Аккаунт | Подписчики | Зачем смотреть |
|---|---|---|
| @hubermanlab | Мега | ГЛАВНЫЙ ориентир: весь язык Brainura отсюда |
| @garybrecka | Крупный | Human biologist; формат 'human upgrade' |
| @femalelongevity | ~200K | Kayla Barnes; brain health, аудитория Sarah |
| @daveasprey | ~263K | Bulletproof founder; ноотропы, когнитивный стек |
| @biohacking_tlv | ~34K | Micro; нишевые идеи до их mainstream выхода |

## Группа 3: Anti-Brain-Rot
*Наш главный контр-нарратив — огромный органический охват*

| Аккаунт | Почему важен |
|---|---|
| @tizianabucec | Ролик про dopamine 2.9M просмотров; ИЗУЧИТЬ ФОРМАТ |
| Хештег #brainrotrecovery | Мониторить — там появляются новые вирусные авторы |

## Конкуренты (обязательный мониторинг)

| Аккаунт | Продукт | Что смотреть |
|---|---|---|
| @lumosity | Lumosity | Форматы, крючки, реакция аудитории |
| @elevateapp | Elevate | Визуальный стиль (Apple Design Award) |
| @impulsebraintraining | Impulse | Уже сделали Stroop Test вирусным — изучить механику |

## Приоритеты мониторинга

**Каждый день:** @hubermanlab, @drrachelbarr, #brainfog, #brainrot, #morningroutine

**Еженедельно:** @garybrecka, @femalelongevity, @benreinneuro, @lumosity, @impulsebraintraining

**Раз в 2 недели:** #coldplunge, #nootropics, #ouraring, TikTok Creative Center (Health & Fitness топ-хештеги)

## Ключевые инсайты

- @drrachelbarr и @benreinneuro = "доверенный учёный" архетип → Brainura должен использовать тот же тон
- Anti-brain-rot контент набирает миллионы просмотров **органически** → первые видео Brainura туда
- Huberman-язык ("protocol", "evidence-based") кодирует доверие у ЦА → использовать в каждом видео
- Stroop Test / Quick Math = "can you beat this?" формат → самый быстрый путь к виральности
`,
    },
    {
      title: "TikTok Keywords & Hashtags — Brainura (апрель 2026)",
      category: "research",
      source: "Исследование TikTok + веб-поиск, апрель 2026",
      isPinned: true,
      tags: ["tiktok", "keywords", "hashtags", "seo", "search", "brainura"],
      content: `# TikTok Keywords & Hashtags для Brainura

## Категория 1: Прямые запросы
\`brain training app\`, \`best brain training app 2026\`, \`cognitive training app\`, \`brain age test\`, \`memory training app\`, \`does brain training work\`, \`lumosity alternative\`, \`elevate alternative\`, \`brain training that actually works\`, \`science backed brain training\`, \`adult brain training app\`

## Категория 2: Боли и страхи (Pain Points)
\`brain fog every morning\`, \`why is my brain foggy in the morning\`, \`morning brain fog fix\`, \`brain feels cloudy all the time\`, \`why do i feel dumb lately\`, \`can't focus in the morning anymore\`, \`my memory is getting worse\`, \`forgetting things in my 30s\`, \`forgetting things in my 40s\`, \`keep forgetting what I was about to say\`, \`losing my edge at work\`, \`feeling slower mentally\`, \`attention span getting shorter\`, \`is tiktok making me dumber\`, \`doomscrolling destroying my brain\`

## Категория 3: Утренний ритуал
\`morning routine for focus\`, \`morning protocol\`, \`huberman morning routine\`, \`andrew huberman morning routine\`, \`morning brain warm up\`, \`morning cognitive warm up\`, \`10 minute morning routine\`, \`minimum effective morning routine\`, \`replace phone scrolling in the morning\`, \`wellness stacking morning\`, \`Atomic Habits morning routine\`, \`what successful people do in the morning\`

## Категория 4: Биохакинг и оптимизация
\`biohacking brain\`, \`neurohacking\`, \`how to optimize your brain\`, \`nootropics vs brain training\`, \`brainergy\`, \`quantified self brain\`, \`how to increase neuroplasticity\`, \`neuroplasticity exercises\`, \`cognitive stack\`, \`oura ring brain performance\`, \`morning dopamine routine\`, \`cold plunge brain benefits\`, \`breathwork for focus\`, \`lion's mane morning routine\`

## Категория 5: Anti-Brain-Rot (ГЛАВНАЯ ВОЗМОЖНОСТЬ)
\`how to fix brain rot\`, \`brain rot recovery\`, \`how to reverse brain rot\`, \`dopamine detox brain\`, \`fix your attention span\`, \`how to rebuild attention span\`, \`replace doomscrolling\`, \`instead of scrolling do this\`, \`tiktok brain rot test\`

**Инсайт:** APA study (ноябрь 2025) подтвердил brain rot от TikTok. Люди ищут выход — и Brainura = антидот.

## Категория 6: Когнитивное старение
\`cognitive decline in 30s\`, \`cognitive decline in 40s\`, \`how to prevent cognitive decline\`, \`brain health after 40\`, \`is brain fog normal at 35\`, \`brain age test how accurate\`, \`alzheimer's prevention habits\`, \`how to improve working memory\`, \`normal forgetfulness vs concern\`

## Категория 7: Вирусные челленджи
\`stroop test challenge\`, \`only geniuses can pass this\`, \`your brain is lying to you\`, \`can you pass this color test\`, \`brain trick that breaks your mind\`, \`quick math challenge\`, \`mental math speed test\`, \`how good is your memory really\`, \`30 day brain challenge\`, \`75 smart challenge\`

## Категория 8: Продуктивность
\`how to get into flow state faster\`, \`deep work morning routine\`, \`dopamine baseline morning routine\`, \`how to build focus like a muscle\`, \`productivity hacks for professionals\`, \`morning deep work session\`

## Категория 9: Конкурентные запросы
\`Lumosity review 2025\`, \`Lumosity vs Elevate\`, \`Duolingo but for your brain\`, \`brain games that aren't childish\`, \`brain training app without ads\`, \`best brain training app Reddit\`

## Категория 10: TikTok POV / Slang
\`brain fog is ruining my life\`, \`POV you discover brain training\`, \`I replaced doomscrolling with this\`, \`wait you guys aren't training your brain?\`, \`the Stroop test humbled me\`, \`brain training glow up\`, \`if you have brain fog watch this\`, \`morning protocol check\`, \`my brain age is younger than me\`

## Нишевые хештеги (высокая релевантность)
\`#braintraining\` \`#brainhealth\` \`#braingames\` \`#cognitivetraining\` \`#neuroplasticity\` \`#neurohacking\` \`#biohacking\` \`#biohacker\` \`#nootropics\` \`#brainpower\` \`#brainworkout\` \`#brainhack\` \`#braingain\` \`#sharperbrain\` \`#trainyourbrain\` \`#morningprotocol\` \`#morningbrain\` \`#brainage\` \`#mentalfitness\` \`#brainfog\` \`#brainrot\` \`#brainrotrecovery\` \`#strooptest\` \`#hubermanlab\` \`#andrewhuberman\` \`#wellnessstacking\` \`#cognitivehealth\` \`#10minutehabit\`

## Широкие хештеги (reach amplifiers)
\`#wellnesstok\` (1.6B views) \`#selfimprovement\` \`#productivity\` \`#morningmotivation\` \`#habitstacking\` \`#atomichabits\` \`#longevity\` \`#deepwork\` \`#dopaminedetox\` \`#highperformer\` \`#optimizeyourlife\` \`#mindsetshift\` \`#fyp\`

## Стратегические инсайты

| Инсайт | Применение |
|---|---|
| #wellnesstok — 1.6 млрд просмотров | Обязательный тег на каждое видео |
| "Brainergy" — buzzword 2026 | Использовать пока конкуренты не подхватили |
| Huberman-контент = сотни тысяч лайков | #hubermanlab + "missing piece in Huberman routine" |
| Stroop Test уже viral (Impulse app) | Формат "can you beat this?" — быстрейший путь к охвату |
| Anti-brain-rot контент органически вирален | Первые ролики Brainura = заходить через этот нарратив |
| Nootropics рынок +23% г/г | Перехватывать: "тренировка работает лучше таблетки" |
`,
    },
  ];

  console.log("\nAdding knowledge articles...");
  for (const article of knowledgeArticles) {
    const existing = await prisma.knowledgeArticle.findFirst({
      where: { projectId: PROJECT_ID, title: article.title },
    });
    if (existing) {
      await prisma.knowledgeArticle.update({
        where: { id: existing.id },
        data: article,
      });
      console.log(`  ↺ Updated: ${article.title}`);
    } else {
      await prisma.knowledgeArticle.create({
        data: { ...article, projectId: PROJECT_ID },
      });
      console.log(`  ✓ Created: ${article.title}`);
    }
  }

  console.log("\n✅ Done!");
  console.log(`  Accounts added: ${donorAccounts.length}`);
  console.log(`  Knowledge articles: ${knowledgeArticles.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
