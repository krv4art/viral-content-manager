# Viral Content Manager — Codebase Reference

> Single source of truth. Read this before any task — no exploration needed.

> **Maintenance rule:** After every feature implementation or ТЗ, update this file before marking the task done. Cover: new/changed routes, schema fields, server action signatures, Inngest function behaviour, new UI components, changed conventions.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4, React 19 (`"use client"` / `"use server"`) |
| Database | Prisma 7.7 + `@prisma/adapter-pg` + Neon PostgreSQL (serverless) |
| Background jobs | Inngest 4.2 (event-driven, retries, cron) |
| UI | shadcn/ui (19 components) + Tailwind 4 + lucide-react icons |
| AI analysis | Google Gemini 2.0 Flash (video analysis) + GLM-5.1/GLM-5V-Turbo via z.ai (comment & thumbnail analysis) |
| Scraping | ScrapeCreators API (TikTok + Instagram) |
| Image gen | Runware API (optional) |
| Notifications | sonner (toast) |

---

## 2. Project Overview

Вирусный контент-менеджер: отслеживает аккаунты конкурентов → скрейпит видео → анализирует через Gemini AI → извлекает хуки/скрипты → создаёт персонажей-создателей → тестирует контент-гипотезы.

---

## 3. Directory Map

```
src/
  app/                    ← Next.js routes (pages + API)
  actions/                ← ALL server actions (CRUD + Inngest triggers)
  components/
    layout/               ← Sidebar, Header, ProjectProvider, ProjectSwitcher
    ui/                   ← shadcn/ui primitives (button, table, dialog, etc.)
  hooks/
    use-persisted-state.ts ← usePersistedState<T> + usePersistedSet (localStorage persistence)
  lib/
    inngest/
      client.ts           ← Inngest instance ("viral-content-manager")
      functions/          ← 7 background job functions
    integrations/
      gemini.ts           ← Gemini API (video analysis only)
      glm.ts              ← GLM API via z.ai (comment analysis, thumbnail OCR)
      scrapecreators.ts   ← ScrapeCreators API (profiles, videos, comments)
      runware.ts          ← Runware API (image generation)
      tiktok-direct.ts    ← Direct TikTok HTTP scraping (hashtag pages + search API)
    utils/
      formatters.ts       ← formatNumber, formatDate, formatPercent, formatDuration, formatRelativeTime
      metrics.ts          ← calculateEngagementRate, calculateAvgViews, calculateMedianViews, calculateViralityScore
    utils.ts              ← cn() helper (clsx + twMerge)
    db.ts                 ← Prisma singleton (globalForPrisma pattern)
prisma/
   schema.prisma           ← 9 models
  migrations/             ← DB migrations
```

---

## 4. Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Dashboard: stats, top videos, active hypotheses, hot trends |
| `/projects` | `app/projects/page.tsx` | Projects list: create/edit/delete, platform badges, counts |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | Project settings: name, productDoc, URLs, platforms |
| `/accounts` | `app/accounts/page.tsx` | Accounts: list, scrape, filter by platform/category, status badges |
| `/accounts/[id]` | `app/accounts/[id]/page.tsx` | Account detail view |
| `/videos` | `app/videos/page.tsx` | Videos: table, pagination (50/page), batch analyze, scrape stats per row |
| `/videos/[id]` | `app/videos/[id]/page.tsx` | Video detail: analysis, hooks, scripts |
| `/hooks` | `app/hooks/page.tsx` | Hooks library: filter by type/language/rating, adapt text |
| `/hypotheses` | `app/hypotheses/page.tsx` | Content experiments: status/priority tracking |
| `/scripts` | `app/scripts/page.tsx` | Script templates: filter by format/language |
| `/creators` | `app/creators/page.tsx` | Creator personas: list by status |
| `/creators/[id]` | `app/creators/[id]/page.tsx` | Creator detail: personality, appearance, voice, visuals, image gen |
| `/trends` | `app/trends/page.tsx` | Trends: filter by type/platform/relevance |
| `/keywords` | `app/keywords/page.tsx` | Keywords: table, cluster stats, import seed, discover channels by keywords, filter by cluster/type/coverage/priority/intent |
| `/carousels` | `app/carousels/page.tsx` | Carousel list: filter by type/status, create from URL or video, trigger analysis |
| `/carousels/[id]` | `app/carousels/[id]/page.tsx` | Carousel editor: slides with text/image prompt/preview, analyze, adapt, generate images |
| `/knowledge` | `app/knowledge/page.tsx` | Knowledge base: articles by category |
| `/knowledge/[id]` | `app/knowledge/[id]/page.tsx` | Article detail |
| `/api/inngest` | `app/api/inngest/route.ts` | Inngest webhook (GET, POST, PUT) — only API route |
| `/settings` | `app/settings/page.tsx` | API-ключи (маскированные, DB/env) — ScrapeCreators, Gemini, Runware, GLM (z.ai); авто-скрейп toggle, ручной запуск, исправление TikTok-ссылок |

---

## 5. Database Models (`prisma/schema.prisma`)

### Project
```
id              String   @id @default(cuid())
name            String
description     String?  @db.Text
appStoreUrl     String?
playStoreUrl    String?
websiteUrl      String?
productDoc      String?  @db.Text
targetPlatforms String[]
targetRegions   String[]
createdAt/updatedAt DateTime
→ accounts[], videos[], hooks[], scripts[], creators[], trends[], hypotheses[], knowledge[], keywords[]
```

### Account
```
id                String   @id @default(cuid())
projectId         String   → Project (onDelete: Cascade)
platform          String   — tiktok | instagram | youtube | twitter
username          String
url               String
displayName       String?
bio               String?  @db.Text
followersCount    Int?
followingCount    Int?
videosCount       Int?
avgViews          Int?
medianViews       Int?     — вычисляется при скрейпе через calculateMedianViews()
avgEngagementRate Float?
category          String   @default("competitor")  — competitor|inspiration|own|trending
tags              String[]
autoScrape        Boolean  @default(true)  — per-account toggle для scrape-all-accounts
colorLabels       Json?    — массив {color: string, text: string}[]; color = id из COLOR_PALETTE (red|orange|amber|green|blue|purple|pink|slate)
notes             String?  @db.Text
lastScrapedAt     DateTime?
scrapeStatus      String   @default("idle")  — idle|in_progress|error
createdAt/updatedAt DateTime
→ videos[], creators[]
@@unique([projectId, platform, username])
```

### Video
```
id              String   @id @default(cuid())
projectId       String   → Project (onDelete: Cascade)  — прямая связь, добавлена для поддержки orphan-видео
accountId       String?  → Account (onDelete: SetNull)  — nullable: null = аккаунт удалён, видео сохранено
platform        String
videoId         String   — platform-specific ID
url             String
type            String   @default("video")  — video|shorts|reel|clip
thumbnailUrl    String?
description     String?  @db.Text
durationSeconds Int?
viewsCount      Int?
likesCount      Int?
commentsCount   Int?
sharesCount     Int?
savesCount      Int?
engagementRate  Float?
postedAt        DateTime?
hashtags        String[]
musicName       String?
isAnalyzed      Boolean  @default(false)
analysis        Json?    — {hook, script, visual, insights, hookType}
hookText        String?  @db.Text
hookVisual      String?  @db.Text
fullScript      String?  @db.Text
tags            String[]
notes           String?  @db.Text
isBookmarked    Boolean  @default(false)
commentsAnalyzedAt  DateTime?          — null = комменты ещё не анализировались
painPoints      String[]  @default([])  — агрегат top-N болей из комментов (AI)
audienceLanguage String[] @default([])  — типовые фразы/сленг из комментов
objections      String[]  @default([])  — возражения из комментов
thumbnailAnalyzed   Boolean @default(false) — прошёл ли OCR с обложки
thumbnailAnalyzedAt DateTime?
createdAt       DateTime @default(now())
→ hooks[], scripts[], comments[]
@@unique([platform, videoId])
```
> Когда accountId = null — видео «осиротевшее» (аккаунт удалён). Отображается в `/videos` с меткой «Аккаунт удалён». Все операции (bookmark, analyze, detail page) продолжают работать через projectId.
> `painPoints`, `audienceLanguage`, `objections` — денормализованный агрегат AI-анализа комментариев. Исходная истина — VideoComment. `thumbnailAnalyzed` — true означает OCR обложки, НЕ полный анализ (`isAnalyzed`).

### Hook
```
id                String   @id @default(cuid())
projectId         String   → Project (onDelete: Cascade)
videoId           String?  → Video (onDelete: SetNull)
text              String   @db.Text
visualDescription String?  @db.Text
hookType          String?  — question|shock|story|pattern_interrupt|controversy|value_promise|curiosity_gap|other
language          String   @default("en")
sourceViews       Int?
sourceEr          Float?
adaptedText       String?  @db.Text
tags              String[]
rating            Int?     — 1..5
notes             String?  @db.Text
isUsed            Boolean  @default(false)
createdAt         DateTime
```

### Script
```
id              String   @id @default(cuid())
projectId       String   → Project (onDelete: Cascade)
videoId         String?  → Video (onDelete: SetNull)
title           String
hook            String?  @db.Text
body            String?  @db.Text
cta             String?  @db.Text
fullText        String?  @db.Text
format          String?
durationSeconds Int?
language        String   @default("en")
sourceViews     Int?
adaptedVersion  String?  @db.Text
tags            String[]
rating          Int?
notes           String?  @db.Text
isUsed          Boolean  @default(false)
createdAt       DateTime
```

### Creator
```
id                 String   @id @default(cuid())
projectId          String   → Project (onDelete: Cascade)
prototypeAccountId String?  → Account (onDelete: SetNull)
name               String
summary            String?  @db.Text
appearance         String?  @db.Text
voiceAndSpeech     String?  @db.Text
personality        String?  @db.Text
background         String?  @db.Text
visualStyle        String?  @db.Text
imageGenPrompt     String?  @db.Text
referenceImages    String[]
generatedImages    String[]
topHooks           Json?
topScripts         Json?
status             String   @default("draft")  — draft|ready|published
notes              String?  @db.Text
createdAt/updatedAt DateTime
```

### Trend
```
id              String   @id @default(cuid())
projectId       String   → Project (onDelete: Cascade)
title           String
description     String?  @db.Text
source          String?
type            String   — hashtag|challenge|format|music|topic
platform        String?
exampleUrls     String[]
relevance       String   @default("warm")  — hot|warm|cold
applicability   Int?     — 1..10
adaptationNotes String?  @db.Text
tags            String[]
createdAt/updatedAt DateTime
```

### Keyword
```
id        String   @id @default(cuid())
projectId String   → Project (onDelete: Cascade)
phrase    String
cluster   String?          — Pain Points|Brain Rot|Morning Routine|...
type      String   @default("search")   — search|hashtag
platform  String   @default("tiktok")   — tiktok|instagram|youtube
volume    String   @default("unknown")  — high|medium|low|unknown
intent    String?          — awareness|consideration|conversion
priority  String   @default("medium")   — high|medium|low
isCovered Boolean  @default(false)
notes     String?  @db.Text
tags      String[]
createdAt/updatedAt DateTime
@@unique([projectId, phrase])
```

### Hypothesis
```
id             String    @id @default(cuid())
projectId      String    → Project (onDelete: Cascade)
title          String
description    String?   @db.Text
format         String?
hookId         String?
scriptId       String?
creatorId      String?
status         String    @default("idea")    — idea|in_production|published|failed
priority       String    @default("medium")  — low|medium|high
expectedResult String?   @db.Text
actualResult   String?   @db.Text
publicationUrl String?
publishedAt    DateTime?
metrics        Json?
learnings      String?   @db.Text
tags           String[]
createdAt/updatedAt DateTime
```

### VideoComment
```
id         String    @id @default(cuid())
videoId    String    → Video (onDelete: Cascade)
author     String?            — никнейм автора
text       String    @db.Text
likesCount Int?
postedAt   DateTime?
language   String?            — "en"|"ru"|... — определяется GLM
sentiment  String?            — "positive"|"negative"|"neutral"
painPoint  String?   @db.Text — если GLM распознал боль
createdAt  DateTime  @default(now())
@@index([videoId])
@@index([videoId, likesCount])
```

### Carousel
```
id           String   @id @default(cuid())
projectId    String   → Project (onDelete: Cascade)
videoId      String?  → Video (onDelete: SetNull)  — nullable: source video from scraped library
title        String
status       String   @default("draft")  — draft|ready|published
carouselType String   @default("reference")  — reference|original
formula      String?  @db.Text  — AI-extracted formula description
sourceUrl    String?  — original carousel URL (TikTok/Instagram)
tags         String[]
notes        String?  @db.Text
slides       CarouselSlide[]
createdAt/updatedAt DateTime
```

### CarouselSlide
```
id          String   @id @default(cuid())
carouselId  String   → Carousel (onDelete: Cascade)
order       Int      — 1-based display order
slideType   String   @default("body")  — cover|body|cta
text        String?  @db.Text  — visible text on the slide
imagePrompt String?  @db.Text  — prompt for AI image generation
imageUrl    String?  — generated image URL (1080×1920 from Runware)
notes       String?  @db.Text
createdAt   DateTime @default(now())
```

### Settings (singleton, id="global")
```
id                   String   @id @default("global")
scrapecreatorsApiKey String?
geminiApiKey         String?
runwareApiKey        String?
glmApiKey            String?
autoScrapeEnabled    Boolean  @default(true)
lastAutoScrapeAt     DateTime?
updatedAt            DateTime @updatedAt
```

### KnowledgeArticle
```
id        String   @id @default(cuid())
projectId String?  → Project (onDelete: Cascade)  — nullable = global article
title     String
content   String   @db.Text
category  String
source    String?
tags      String[]
isPinned  Boolean  @default(false)
createdAt/updatedAt DateTime
```

---

## 6. Server Actions

All files `"use server"`, all return `{ success: true, data }` or `{ error: string }`.

### `src/actions/accounts.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getAccounts` | `(projectId, filters?: {platform?, category?, minAvgViews?, maxFollowers?, minMedianViews?})` | includes `_count.videos`; числовые фильтры используют Prisma `gte`/`lte` |
| `getAccount` | `(id)` | includes videos |
| `createAccount` | `(data: {projectId, platform, username, url, category?, tags?, notes?})` | только создаёт запись, скрейп не запускается |
| `triggerScrapeAccount` | `(id)` | sends `scrape-account` Inngest event |
| `updateAccount` | `(id, data)` | updates any account fields |
| `deleteAccount` | `(id, deleteVideos?: boolean = false)` | если `deleteVideos=true` — удаляет видео явно; иначе onDelete:SetNull оставляет orphan-видео |
| `resetStuckAccounts` | `(projectId)` | resets `in_progress` → `idle` if >5 min |
| `updateScrapeStatus` | `(id, status: "idle"\|"in_progress"\|"error")` | direct DB update |
| `triggerDiscoverChannels` | `(projectId, options?: {maxFollowers?, minViews?, keywordIds?})` | sends `discover-channels` Inngest event; validates maxFollowers >= 1000, minViews >= 0 |

### `src/actions/videos.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getVideos` | `(projectId, filters?: {accountId?, type?, isBookmarked?, search?, take?, skip?})` | returns `{success, data, total}` |
| `getVideo` | `(id)` | includes account, hooks, scripts |
| `createVideo` | `(data: {accountId, projectId, platform, videoId, url, type?, ...stats})` | manual add; `projectId` обязателен |
| `updateVideo` | `(id, data)` | update any video fields |
| `deleteVideo` | `(id)` | |
| `toggleBookmark` | `(id)` | flips isBookmarked |
| `updateAnalysis` | `(id, data: {hookText?, hookVisual?, fullScript?, analysis?, isAnalyzed: true})` | sets isAnalyzed=true |
| `getTopVideos` | `(projectId, limit=10)` | by viewsCount desc |
| `triggerAnalyzeVideo` | `(id)` | sends `analyze-video` Inngest event |
| `triggerBatchAnalyze` | `(accountId, limit=10)` | sends `batch-analyze` Inngest event |
| `scrapeVideoStats` | `(id)` | fetches fresh stats via ScrapeCreators, updates video |

### `src/actions/projects.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getProjects` | `()` | includes `_count` for all relations |
| `getProject` | `(id)` | includes `_count` |
| `createProject` | `(data: {name, description?, appStoreUrl?, playStoreUrl?, websiteUrl?, productDoc?, targetPlatforms?, targetRegions?})` | |
| `updateProject` | `(id, data)` | |
| `deleteProject` | `(id)` | cascade deletes everything |
| `getProjectStats` | `(id)` | returns `{accounts, videos, hooks, scripts, hypotheses}` counts |

### `src/actions/comments.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getVideoComments` | `(videoId: string)` | orderBy likesCount desc, take 100 |
| `triggerAnalyzeComments` | `(videoId: string)` | sends `analyze-comments` Inngest event; rate-limit: 5 min between runs |
| `triggerBatchAnalyzeComments` | `(videoIds: string[])` | sends `analyze-comments` for each; revalidates `/videos` |
| `getProjectPainPoints` | `(projectId: string, limit?: number)` | aggregates Video.painPoints → Map<text, count>; returns `{text, count, videoIds}[]` |

### `src/actions/hooks.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getHooks` | `(projectId, filters?: {hookType?, language?, rating?, isUsed?, tags?})` | includes video→account |
| `getHook` | `(id)` | includes video |
| `createHook` | `(data: {projectId, text, visualDescription?, hookType?, language?, videoId?, sourceViews?, sourceEr?, tags?})` | |
| `updateHook` | `(id, data)` | includes adaptedText, rating, isUsed |
| `deleteHook` | `(id)` | |
| `getHookPatterns` | `(projectId)` | groups hooks by hookType, calculates medianViews/avgViews/avgER/avgVirality per type + top-3 hooks; returns `HookPatternStats[]` |

### `src/actions/scripts.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getScripts` | `(projectId, filters?: {format?, language?, rating?, isUsed?})` | includes video |
| `getScript` | `(id)` | includes video |
| `createScript` | `(data: {projectId, title, hook?, body?, cta?, fullText?, format?, durationSeconds?, language?, videoId?, sourceViews?, tags?})` | |
| `updateScript` | `(id, data)` | includes adaptedVersion, rating, isUsed |
| `deleteScript` | `(id)` | |

### `src/actions/creators.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getCreators` | `(projectId, filters?: {status?})` | includes prototypeAccount |
| `getCreator` | `(id)` | includes prototypeAccount |
| `createCreator` | `(data: {projectId, name, summary?, appearance?, voiceAndSpeech?, personality?, background?, visualStyle?, imageGenPrompt?, referenceImages?, generatedImages?, topHooks?, topScripts?, status?, notes?, prototypeAccountId?})` | |
| `updateCreator` | `(id, data)` | topHooks/topScripts serialized to JSON |
| `deleteCreator` | `(id)` | |
| `triggerCreateCreatorFromPrototype` | `(projectId, accountId, creatorName)` | creates creator + sends `create-creator-doc` event |
| `checkRunwareKey` | `()` | returns `{available: boolean}` |

### `src/actions/hypotheses.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getHypotheses` | `(projectId, filters?: {status?, priority?, format?})` | |
| `getHypothesis` | `(id)` | |
| `createHypothesis` | `(data: {projectId, title, description?, format?, hookId?, scriptId?, creatorId?, priority?, expectedResult?, tags?})` | |
| `updateHypothesis` | `(id, data)` | includes actualResult, publicationUrl, publishedAt, metrics (Json), learnings |
| `deleteHypothesis` | `(id)` | |

### `src/actions/trends.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getTrends` | `(projectId, filters?: {type?, platform?, relevance?})` | |
| `getTrend` | `(id)` | |
| `createTrend` | `(data: {projectId, title, description?, type, platform?, relevance?, applicability?, adaptationNotes?, tags?, exampleUrls?})` | |
| `updateTrend` | `(id, data)` | |
| `deleteTrend` | `(id)` | |

### `src/actions/keywords.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getKeywords` | `(projectId, filters?: {cluster?, type?, volume?, intent?, priority?, isCovered?, take?, skip?})` | returns `{success, data, total}` |
| `getKeyword` | `(id)` | |
| `createKeyword` | `(data: {projectId, phrase, cluster?, type?, platform?, volume?, intent?, priority?, notes?, tags?})` | |
| `updateKeyword` | `(id, data)` | includes isCovered |
| `deleteKeyword` | `(id)` | |
| `getClusterStats` | `(projectId)` | returns `{cluster, total, covered}[]` |
| `seedKeywords` | `(projectId)` | upserts ~300 BRAINURA_KEYWORDS, returns `{count}` |

### `src/actions/carousels.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getCarousels` | `(projectId, filters?: {status?, carouselType?})` | includes `_count.slides`, `video` |
| `getCarousel` | `(id)` | includes slides ordered by `order`, video |
| `createCarousel` | `(data: {projectId, title, carouselType?, sourceUrl?, videoId?, tags?, notes?})` | |
| `updateCarousel` | `(id, data)` | title, status, carouselType, formula, sourceUrl, videoId, tags, notes |
| `deleteCarousel` | `(id)` | cascades to slides |
| `createSlide` | `(carouselId, data: {order, slideType?, text?, imagePrompt?, imageUrl?, notes?})` | |
| `updateSlide` | `(id, data)` | order, slideType, text, imagePrompt, imageUrl, notes |
| `deleteSlide` | `(id)` | |
| `reorderSlides` | `(carouselId, orderedIds: string[])` | batch-updates order by index position |
| `generateSlideImage` | `(slideId)` | calls Runware (1080×1920), saves imageUrl to slide |
| `triggerAnalyzeCarousel` | `(carouselId)` | sends `analyze-carousel` Inngest event |
| `triggerAdaptCarousel` | `(carouselId)` | sends `adapt-carousel` Inngest event |

### `src/actions/knowledge.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getArticles` | `(projectId?, filters?: {category?, search?})` | projectId nullable = global articles |
| `getArticle` | `(id)` | |
| `createArticle` | `(data: {projectId?, title, content, category, source?, tags?, isPinned?})` | |
| `updateArticle` | `(id, data)` | |
| `deleteArticle` | `(id)` | |

### `src/actions/settings.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getSettings` | `()` | Читает singleton Settings (id="global"). Ключи замаскированы (`••••1234`). Возвращает `source: "db"\|"env"\|"none"` для каждого ключа, `autoScrapeEnabled`, `lastAutoScrapeAt` |
| `updateSettings` | `(data: {scrapecreatorsApiKey?, geminiApiKey?, runwareApiKey?, glmApiKey?, autoScrapeEnabled?})` | upsert id="global", revalidatePath("/settings") |
| `triggerManualScrapeAll` | `()` | Шлёт `scrape-account` batch-события для всех аккаунтов со статусом не "in_progress". Возвращает `{ count }` |

### `src/lib/settings.ts`
```ts
getApiKey(field: "scrapecreatorsApiKey" | "geminiApiKey" | "runwareApiKey" | "glmApiKey"): Promise<string>
```
Приоритет: DB → env var → "". Используется внутри интеграций (scrapecreators, gemini, runware, glm).

---

## 7. Inngest Background Functions (`src/lib/inngest/functions/`)

> **After every `vercel --prod` that adds a new function** — run sync immediately:
> `curl -X PUT https://viral-content-manager.vercel.app/api/inngest`
> Expected: `{"message":"Successfully registered","modified":true}`. See full notes in `AGENTS.md § Inngest`.

### `scrape-account.ts` — `scrapeAccount`
- **Event:** `scrape-account` `{ accountId: string }`
- **Retries:** 2 | **onFailure:** sets `scrapeStatus = "error"`
1. Set `scrapeStatus = "in_progress"`
2. Fetch account from DB
3. `scrapeAccountProfile(platform, username)` → update displayName, bio, followers, following, videosCount, lastScrapedAt
4. `scrapeAccountVideos(platform, username)` → array of videos
5. For each video: `calculateEngagementRate()` → `prisma.video.upsert` on `(platform, videoId)`, в `create` передаётся `projectId: account.projectId`
6. Calculate `avgViews` + `medianViews` + `avgEngagementRate` from all account videos (`calculateMedianViews`)
7. Update account with stats + `scrapeStatus = "idle"`

### `analyze-video.ts` — `analyzeVideo`
- **Event:** `analyze-video` `{ videoId: string }`
- **Retries:** 2 | **onFailure:** logs error
1. Fetch video with account/project info
2. `analyzeVideo(video.url, video.description)` → VideoAnalysis
3. Save `hookText`, `hookVisual`, `fullScript`, `analysis`, `isAnalyzed=true` to video
4. If hookText → create Hook record (`projectId`, `videoId`, sourceViews, sourceEr)
5. If fullScript → create Script record (`title=description`, `body=fullScript`, `hook=hookText`)

### `batch-analyze.ts` — `batchAnalyze`
- **Event:** `batch-analyze` `{ accountId: string, limit?: number }`
- **Retries:** 1
1. Fetch top `limit` (default 10) unanalyzed videos by viewsCount desc
2. If none → return early
3. Dispatch `analyze-video` event for each video

### `create-creator-doc.ts` — `createCreatorDoc`
- **Event:** `create-creator-doc` `{ creatorId: string, accountId: string }`
- **Retries:** 2 | **onFailure:** logs error
1. Fetch creator from DB
2. Fetch prototype account
3. `scrapeAccountProfile()` → update account metadata
4. Get top 5 videos (from DB or scrape if insufficient)
5. Analyze each video with `analyzeVideo()`
6. Aggregate: hooks, scripts, visuals, insights, image gen prompt
7. Update creator: summary, appearance, voiceAndSpeech, personality, visualStyle, imageGenPrompt, topHooks, topScripts, `status = "ready"`

### `scrape-all-accounts.ts` — `scrapeAllAccounts`
- **Cron:** `0 3 * * 1` (Monday 3:00 UTC)
- **Retries:** 1
1. Check `autoScrapeEnabled` flag from Settings singleton
2. If disabled → return early with `{ skipped: true }`
3. Fetch all accounts where `scrapeStatus != "in_progress"` **AND** `autoScrape = true`
4. Dispatch `scrape-account` event for each
5. Update `lastAutoScrapeAt` in Settings

### `discover-channels.ts` — `discoverChannels`
- **Event:** `discover-channels` `{ projectId, maxFollowers?, minViews?, keywordIds? }`
- **Retries:** 1
1. Verify project exists
2. Fetch keywords from DB filtered by `projectId` (and optional `keywordIds`)
3. For each keyword in separate `step.run`:
   - `type === "hashtag"` → `scrapeHashtagVideos(phrase)`
   - `type === "search"` → `scrapeSearchVideos(phrase)`
   - 2.5s delay between keywords
4. Deduplicate videos by `videoId`
5. Filter accounts: `followersCount > 0 && <= maxFollowers`; filter videos: `viewsCount >= minViews`
6. Upsert accounts via `prisma.account.upsert` on `(projectId, platform, username)` with `category: "trending"` (not overwritten on update)
7. Upsert videos via `prisma.video.upsert` on `(platform, videoId)` with engagementRate
8. **Thumbnail OCR:** `analyze-thumbnails` step — fetches up to 50 new videos with `thumbnailAnalyzed=false`, calls `analyzeThumbnailGLM()` (GLM-5V-Turbo) for each (500ms delay), updates `hookText`/`hookVisual`/`thumbnailAnalyzed=true` (does NOT set `isAnalyzed=true`)
9. Return `{ keywordsProcessed, accountsFound, videosFound }`

### `analyze-carousel.ts` — `analyzeCarouselFn`
- **Event:** `analyze-carousel` `{ carouselId: string }`
- **Retries:** 2 | **onFailure:** logs error
1. Fetch carousel (sourceUrl, video.url) from DB
2. Determine analysis URL: `carousel.sourceUrl` OR `video.url`
3. `analyzeCarousel(url)` via Gemini → `{ formula, slides: {order, slideType, text, imagePrompt}[] }`
4. Delete existing slides, `createMany` new slides, update `carousel.formula`
5. Return `{ carouselId, formula, slidesExtracted }`

### `adapt-carousel.ts` — `adaptCarouselFn`
- **Event:** `adapt-carousel` `{ carouselId: string }`
- **Retries:** 2 | **onFailure:** logs error
1. Fetch carousel + slides + project.productDoc
2. `adaptCarouselGLM(slides, productDoc)` via Groq → adapted texts + imagePrompts per slide
3. Create a NEW Carousel (carouselType="original") with adapted slides — reference is NOT modified
4. Return `{ originalCarouselId, newCarouselId }`

### `analyze-comments.ts` — `analyzeCommentsFn`
- **Event:** `analyze-comments` `{ videoId: string }`
- **Retries:** 2 | **onFailure:** logs error (does NOT set commentsAnalyzedAt)
1. Fetch Video with projectId, platform, url
2. Fetch Project.productDoc for context
3. `scrapeVideoComments(platform, url, 100)` — if empty, set `commentsAnalyzedAt=now()`, empty arrays, finish
4. `prisma.videoComment.createMany` raw comments (skipDuplicates)
5. `analyzeCommentsGLM(commentsArray, productDoc)` via GLM-5.1 (z.ai)
6. Update Video: `painPoints`, `audienceLanguage`, `objections`, `commentsAnalyzedAt=now()`
7. Update each VideoComment with AI fields (language, sentiment, painPoint) by index

---

## 8. External Integrations

### `src/lib/integrations/scrapecreators.ts`
Base URL: `https://api.scrapecreators.com` | Auth: `x-api-key: SCRAPECREATORS_API_KEY`

**`scrapeAccountProfile(platform, username)`** → `ScrapeProfileResult`
- TikTok: `GET /v1/tiktok/profile?handle={username}`
  - Maps: `userInfo.user.nickname` → displayName, `userInfo.stats.followerCount` → followersCount
- Instagram: `GET /v1/instagram/profile?handle={username}`
  - Maps: `graphql.user.full_name` → displayName, `edge_followed_by.count` → followersCount
- Throws on `account_deactivated` or 4xx

**`scrapeAccountVideos(platform, username, limit?)`** → `ScrapeVideoResult[]`
- TikTok: `GET /v3/tiktok/profile/videos?handle={username}`
  - `data.aweme_list` → maps: `aweme_id` → videoId, `statistics.play_count` → viewsCount, `statistics.digg_count` → likesCount
- Instagram: `GET /v1/instagram/user/reels?handle={username}`
  - `data.items` → maps: `pk` → videoId, `play_count` → viewsCount, `like_count` → likesCount
- Returns: `{ videoId, url, description, thumbnailUrl, durationSeconds, viewsCount, likesCount, commentsCount, sharesCount, savesCount, postedAt, hashtags, musicName }`

**`scrapeVideoComments(platform, videoUrl, limit?)`** → `ScrapeCommentResult[]`
- TikTok: `GET /v2/tiktok/video/comments?url={videoUrl}`
  - Returns comments with `text`, `user.unique_id`, `digg_count`, `create_time`
- Instagram: `GET /v1/instagram/media/comments?shortcode={shortcode}`
  - Extracts shortcode from URL (`/reel/{shortcode}/` or `/p/{shortcode}/`)
  - Returns comments with `text`, `owner.username`, `like_count`
- Sorted by `likesCount desc`, limited to `limit` (default 100)

### `src/lib/integrations/gemini.ts`
URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
Auth: `?key=GEMINI_API_KEY`

**`analyzeVideo(videoUrl, description?)`** → `VideoAnalysis`
- Sends video URL as `fileData.fileUri` + text prompt
- Config: `temperature: 0.4`, `maxOutputTokens: 2048`, `responseMimeType: "application/json"`
- Returns: `{ hookText, hookVisual, fullScript, analysis: { hook, script, visual, insights, hookType } }`

**`analyzeCarousel(carouselUrl)`** → `CarouselAnalysis`
- Sends video URL as `fileData.fileUri` (same as analyzeVideo — works for carousels as slideshows)
- Carousel-specific prompt: extract each slide (slideType, text, imagePrompt) + overall formula
- Returns: `{ formula: string, slides: { order, slideType, text, imagePrompt }[] }`

**`analyzeComments(comments, productContext?)`** → `CommentAnalysisResult` — *legacy, still exported but no longer called by Inngest functions*

**`analyzeThumbnail(thumbnailUrl)`** → `ThumbnailAnalysis` — *legacy, still exported but no longer called by Inngest functions*

### `src/lib/integrations/glm.ts`
URL: `https://api.groq.com/openai/v1/chat/completions` | Auth: `Authorization: Bearer GROQ_API_KEY`
OpenAI-compatible format.

**`adaptCarouselGLM(slides, productDoc)`** → `{ formula, slides: AdaptedSlide[] }`
- Model: `llama-3.3-70b-versatile`
- Takes reference carousel slides + product doc → returns adapted texts + imagePrompts per slide
- Creates NEW slides with same structure (cover/body/cta) adapted for the product
- Temperature: 0.6 (creative)

**`analyzeCommentsGLM(comments, productContext?)`** → `CommentAnalysisResult`
- Model: `llama-3.3-70b-versatile` (was glm-5.1)
- Config: `temperature: 0.3`, `max_tokens: 4096`, `response_format: { type: "json_object" }`
- Returns: `{ painPoints: string[], audienceLanguage: string[], objections: string[], perComment: {index, language, sentiment, painPoint}[] }`
- Strips ```json markdown wrappers via `parseJsonResponse()`
- Timeout: 60s

**`analyzeThumbnailGLM(thumbnailUrl)`** → `ThumbnailAnalysis`
- Model: `glm-5v-turbo` (vision)
- Downloads image → base64 → `image_url` content block
- Config: `temperature: 0.2`, `max_tokens: 512`, `response_format: { type: "json_object" }`
- Returns: `{ hookText, hookVisual, hookType }` — null values on failure
- Timeout: 30s (image fetch: 15s)

### `src/lib/integrations/runware.ts`
URL: `https://api.runware.ai/v1` | Auth: `Authorization: Bearer RUNWARE_API_KEY`

**`generateImage(prompt, options?)`** → `string` (image URL)
- Default: 1024×1024, model `"runware:100@1"`
- Optional: `negativePrompt`, `width`, `height`, `model`

### `src/lib/integrations/tiktok-direct.ts`

Direct HTTP scraping of TikTok without external APIs or Playwright. Returns `TikTokDiscoveredVideo[]` with video stats + author info.

**`scrapeHashtagVideos(hashtag)`** → `TikTokDiscoveredVideo[]`
- GET `https://www.tiktok.com/tag/{hashtag}` with browser headers
- Extracts `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` JSON
- Parses `__DEFAULT_SCOPE__["webapp.hashtag-detail"].itemList[]`
- Returns videos with author data (username, displayName, followersCount, bio, avatarUrl)
- Graceful fallback: 403/429 → `[]`, timeout (30s) → `[]`, parse error → `[]`
- Strips leading `#` from hashtag, encodes URI components

**`scrapeSearchVideos(keyword)`** → `TikTokDiscoveredVideo[]`
- GET `https://www.tiktok.com/api/search/item/full/?keyword={kw}&cursor=0&count=30&aid=1988`
- Browser headers + Referer
- Parses `item_list[].item` / `aweme_info`
- Same graceful fallback as hashtag scraping
- May require `msToken` cookie — returns `[]` on 4xx

---

## 9. Utility Functions

### `src/lib/utils/formatters.ts`
| Function | Returns | Example |
|----------|---------|---------|
| `formatNumber(num)` | K/M/B suffix | `1500 → "1.5K"` |
| `formatDate(date)` | RU locale | `"10 апр 2026"` |
| `formatPercent(value)` | % string | `"17.3%"` |
| `formatDuration(seconds)` | M:SS | `"2:35"` |
| `formatRelativeTime(date)` | relative | `"3d ago"` or date if >30d |

### `src/lib/utils/metrics.ts`
| Function | Formula |
|----------|---------|
| `calculateEngagementRate(likes, comments, shares, saves, views)` | `(likes+comments+shares+saves) / views * 100` |
| `calculateAvgViews(views[])` | rounded mean |
| `calculateMedianViews(views[])` | median |
| `calculateViralityScore(er, views, avgViews)` | `er * (views/avgViews) * 10 / 10` |

### `src/lib/utils.ts`
- `cn(...inputs)` — clsx + twMerge for Tailwind class merging

---

## 10. Custom UI Components (`src/components/ui/`)

| Компонент | Файл | Описание |
|-----------|------|---------|
| `TagInput` | `tag-input.tsx` | Chip-инпут для тегов. Props: `value: string[]`, `onChange`, `placeholder?`. Добавление по Enter/запятой, удаление по ×. Используется на `/accounts` и `/accounts/[id]` |
| `ColorLabelPopover` | `accounts/page.tsx` (inline) | Попover для цветных меток аккаунта. Метка = `{color, text}`, хранится в `Account.colorLabels (Json?)`. Иконка Tag в строке таблицы. Сохраняет через `updateAccount(id, { colorLabels })` с обязательной сериализацией `JSON.parse(JSON.stringify(...))` |
| `Multiselect` | `multiselect.tsx` | Дропдаун с чекбоксами для мультиселект-фильтров. Props: `label`, `options: {value, label}[]`, `selected: string[]`, `onChange`, `width?`. Использует `DropdownMenu + DropdownMenuCheckboxItem`. Заменяет одиночные `<Select>` фильтры на `/accounts`, `/videos`, `/hooks`, `/scripts`, `/trends` |

> Мультиселект-фильтры работают по OR-логике. Server actions для accounts/videos/hooks/scripts/trends поддерживают `string[]` через `{ in: [...] }` в Prisma where.

---

## 10b. Filter Persistence (`src/hooks/use-persisted-state.ts`)

All page filters are persisted in `localStorage` via `usePersistedState<T>(key, default)` and `usePersistedSet(key, defaultKeys[])`. Keys follow `vb-{page}-{filter}` format.

**Persisted:** filters, viewMode, visibleColumns, sort field + direction.
**NOT persisted:** `page` (pagination), `loading`, dialog states, `selected`, `showStatFilters`, `expandedId`, `saving`, `deleting`, `searchQuery`.

| Page | Persisted keys |
|------|---------------|
| `/accounts` | `vb-accounts-platform`, `vb-accounts-category`, `vb-accounts-tag`, `vb-accounts-min-avg-views`, `vb-accounts-min-median-views`, `vb-accounts-max-followers`, `vb-accounts-columns` |
| `/videos` | `vb-videos-account`, `vb-videos-type`, `vb-videos-bookmarked`, `vb-videos-sort-field`, `vb-videos-sort-dir`, `vb-videos-columns` (+ `useEffect` resets `filterAccount` on `projectId` change) |
| `/hooks` | `vb-hooks-type`, `vb-hooks-lang`, `vb-hooks-rating`, `vb-hooks-used`, `vb-hooks-view-mode` (grid|table|patterns), `vb-hooks-columns` |
| `/scripts` | `vb-scripts-format`, `vb-scripts-lang`, `vb-scripts-rating`, `vb-scripts-columns` |
| `/trends` | `vb-trends-type`, `vb-trends-platform`, `vb-trends-relevance` |
| `/hypotheses` | `vb-hypotheses-columns` |
| `/keywords` | `vb-keywords-cluster`, `vb-keywords-type`, `vb-keywords-covered`, `vb-keywords-priority`, `vb-keywords-intent`, `vb-keywords-columns` |
| `/creators` | `vb-creators-status` |
| `/knowledge` | `vb-knowledge-category` |

---

## 11. UI Patterns (all `page.tsx` files)

```typescript
// Standard page structure
"use client"

const { projectId } = useCurrentProject()  // from src/components/layout/project-provider.tsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [dialogOpen, setDialogOpen] = useState(false)

// Fetch with useCallback + useEffect
const fetchData = useCallback(async () => {
  const res = await getXxx(projectId, filters)
  if (res.success) setData(res.data)
  setLoading(false)
}, [projectId, ...filters])

useEffect(() => { fetchData() }, [fetchData])

// Actions
const handleCreate = async () => {
  const res = await createXxx(formData)
  if (res.success) { toast.success("..."); fetchData() }
  else toast.error("...")
}

// Render: loading skeletons → empty state → Table
// Polling for async operations:
useEffect(() => {
  const hasInProgress = accounts.some(a => a.scrapeStatus === "in_progress")
  if (!hasInProgress) return
  const interval = setInterval(fetchData, 5000)
  return () => clearInterval(interval)
}, [accounts, fetchData])
```

**Table pattern:** shadcn `<Table>` with `<Skeleton>` on load, empty state with CTA Button, pagination `PAGE_SIZE=50` with skip/take.

**Dialogs:** `<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>` with form state reset on success.

---

## 12. Global State

### `src/components/layout/project-provider.tsx`
- Context: `{ projectId, projectName, setProject(id, name) }`
- Hook: `useCurrentProject()` — used in every page
- Persistence: cookie `currentProject` (30-day expiry)

### `src/components/layout/sidebar.tsx`
- 12 nav items: Dashboard, Projects, Accounts, Videos, Hooks, Scripts, Creators, Trends, Keywords, Hypotheses, Knowledge, Settings
- Collapsible (w-64 ↔ w-16), tooltips when collapsed
- **Mobile:** `< md` sidebar hidden, opens as `<Sheet>` drawer from left via hamburger in Header
- Props: `mobileOpen?: boolean`, `onMobileOpenChange?: (open: boolean) => void`

### `src/components/layout/header.tsx`
- Props: `onMenuClick?: () => void` — hamburger button (visible `< md` only)
- Mobile: shows Menu icon button that triggers `onMenuClick`

### `src/components/layout/app-shell.tsx`
- Client component wrapping ThemeProvider + ProjectProvider + Sidebar + Header + main content
- Manages `mobileNavOpen` state, passes to Sidebar and Header
- Main padding: `p-3 md:p-6` (responsive)

---

## 13. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `SCRAPECREATORS_API_KEY` | ScrapeCreators API auth | Yes |
| `GEMINI_API_KEY` | Google Gemini AI | Yes |
| `INNGEST_EVENT_KEY` | Inngest event publishing | Yes |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification | Yes |
| `RUNWARE_API_KEY` | Image generation | Optional |
| `GLM_API_KEY` | GLM AI (z.ai) — comment & thumbnail analysis | Optional |

> Secrets live in `.env.local` (Next.js convention). **Prisma CLI does not read `.env.local`** — only `.env`. For any Prisma DB command, inject DATABASE_URL inline:
> `DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" npx prisma <cmd>`.
> Full Prisma gotchas (flag renames, Neon shadow DB workaround, migration authoring) → see `AGENTS.md §Prisma CLI`.

---

## 14. Key Conventions

- **DB access:** Always through Prisma in `src/actions/` server actions — never in page components
- **Cache invalidation:** `revalidatePath()` called inside actions after mutations
- **Background jobs:** `inngest.send({ name, data })` from server actions — never directly from client
- **Video upsert key:** `@@unique([platform, videoId])` — used in scrape-account for idempotent upserts
- **Account unique key:** `@@unique([projectId, platform, username])`
- **ER formula:** `(likes + comments + shares + saves) / views * 100`
- **scrapeStatus lifecycle:** `idle` → `in_progress` → `idle` | `error`
- **Pagination:** `PAGE_SIZE = 50`, `skip = page * PAGE_SIZE`, `take = PAGE_SIZE`
- **Filters pattern:** `filters?.field !== "all"` guard before including in Prisma where clause
- **JSON fields** (analysis, metrics, topHooks, topScripts): always serialize via `JSON.parse(JSON.stringify(value))` before saving
- **API-ключи приоритет:** DB → env var (через `getApiKey()` из `src/lib/settings.ts`)
- **Mobile responsive:** sidebar → Sheet drawer on `< md`; tables wrapped in `overflow-x-auto` with `min-w-[Npx]`; secondary columns use `hidden md:table-cell`; filter bars use `flex-wrap`; page `p-6` removed (padding in layout `p-3 md:p-6`)
