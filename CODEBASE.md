# Viral Content Manager — Codebase Reference

> Single source of truth. Read this before any task — no exploration needed.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4, React 19 (`"use client"` / `"use server"`) |
| Database | Prisma 7.7 + `@prisma/adapter-pg` + Neon PostgreSQL (serverless) |
| Background jobs | Inngest 4.2 (event-driven, retries, cron) |
| UI | shadcn/ui (19 components) + Tailwind 4 + lucide-react icons |
| AI analysis | Google Gemini 2.0 Flash (video analysis) |
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
  lib/
    inngest/
      client.ts           ← Inngest instance ("viral-content-manager")
      functions/          ← 5 background job functions
    integrations/
      gemini.ts           ← Gemini API (video analysis)
      scrapecreators.ts   ← ScrapeCreators API (profiles + videos)
      runware.ts          ← Runware API (image generation)
    utils/
      formatters.ts       ← formatNumber, formatDate, formatPercent, formatDuration, formatRelativeTime
      metrics.ts          ← calculateEngagementRate, calculateAvgViews, calculateMedianViews, calculateViralityScore
    utils.ts              ← cn() helper (clsx + twMerge)
    db.ts                 ← Prisma singleton (globalForPrisma pattern)
prisma/
  schema.prisma           ← 8 models
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
| `/keywords` | `app/keywords/page.tsx` | Keywords: table, cluster stats, import seed, filter by cluster/type/coverage/priority/intent |
| `/knowledge` | `app/knowledge/page.tsx` | Knowledge base: articles by category |
| `/knowledge/[id]` | `app/knowledge/[id]/page.tsx` | Article detail |
| `/api/inngest` | `app/api/inngest/route.ts` | Inngest webhook (GET, POST, PUT) — only API route |
| `/settings` | `app/settings/page.tsx` | API-ключи (маскированные, DB/env), авто-скрейп toggle, ручной запуск, исправление TikTok-ссылок |

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
→ accounts[], hooks[], scripts[], creators[], trends[], hypotheses[], knowledge[]
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
avgEngagementRate Float?
category          String   @default("competitor")  — competitor|inspiration|own|trending
tags              String[]
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
accountId       String   → Account (onDelete: Cascade)
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
createdAt       DateTime @default(now())
→ hooks[], scripts[]
@@unique([platform, videoId])
```

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

### Settings (singleton, id="global")
```
id                   String   @id @default("global")
scrapecreatorsApiKey String?
geminiApiKey         String?
runwareApiKey        String?
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
| `getAccounts` | `(projectId, filters?: {platform?, category?})` | includes `_count.videos` |
| `getAccount` | `(id)` | includes videos |
| `createAccount` | `(data: {projectId, platform, username, url, category?, tags?, notes?})` | auto-triggers scrape |
| `triggerScrapeAccount` | `(id)` | sends `scrape-account` Inngest event |
| `updateAccount` | `(id, data)` | updates any account fields |
| `deleteAccount` | `(id)` | cascade deletes videos |
| `resetStuckAccounts` | `(projectId)` | resets `in_progress` → `idle` if >5 min |
| `updateScrapeStatus` | `(id, status: "idle"\|"in_progress"\|"error")` | direct DB update |

### `src/actions/videos.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getVideos` | `(projectId, filters?: {accountId?, type?, isBookmarked?, search?, take?, skip?})` | returns `{success, data, total}` |
| `getVideo` | `(id)` | includes account, hooks, scripts |
| `createVideo` | `(data: {accountId, platform, videoId, url, type?, ...stats})` | manual add |
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

### `src/actions/hooks.ts`
| Function | Signature | Notes |
|----------|-----------|-------|
| `getHooks` | `(projectId, filters?: {hookType?, language?, rating?, isUsed?, tags?})` | includes video→account |
| `getHook` | `(id)` | includes video |
| `createHook` | `(data: {projectId, text, visualDescription?, hookType?, language?, videoId?, sourceViews?, sourceEr?, tags?})` | |
| `updateHook` | `(id, data)` | includes adaptedText, rating, isUsed |
| `deleteHook` | `(id)` | |

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
| `updateSettings` | `(data: {scrapecreatorsApiKey?, geminiApiKey?, runwareApiKey?, autoScrapeEnabled?})` | upsert id="global", revalidatePath("/settings") |
| `triggerManualScrapeAll` | `()` | Шлёт `scrape-account` batch-события для всех аккаунтов со статусом не "in_progress". Возвращает `{ count }` |

### `src/lib/settings.ts`
```ts
getApiKey(field: "scrapecreatorsApiKey" | "geminiApiKey" | "runwareApiKey"): Promise<string>
```
Приоритет: DB → env var → "". Используется внутри интеграций (scrapecreators, gemini, runware).

---

## 7. Inngest Background Functions (`src/lib/inngest/functions/`)

### `scrape-account.ts` — `scrapeAccount`
- **Event:** `scrape-account` `{ accountId: string }`
- **Retries:** 2 | **onFailure:** sets `scrapeStatus = "error"`
1. Set `scrapeStatus = "in_progress"`
2. Fetch account from DB
3. `scrapeAccountProfile(platform, username)` → update displayName, bio, followers, following, videosCount, lastScrapedAt
4. `scrapeAccountVideos(platform, username)` → array of videos
5. For each video: `calculateEngagementRate()` → `prisma.video.upsert` on `(platform, videoId)`
6. Calculate `avgViews` + `avgEngagementRate` from all account videos
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
3. Fetch all accounts where `scrapeStatus != "in_progress"`
4. Dispatch `scrape-account` event for each
5. Update `lastAutoScrapeAt` in Settings

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

### `src/lib/integrations/gemini.ts`
URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
Auth: `?key=GEMINI_API_KEY`

**`analyzeVideo(videoUrl, description?)`** → `VideoAnalysis`
- Sends video URL as `fileData.fileUri` + text prompt
- Config: `temperature: 0.4`, `maxOutputTokens: 2048`, `responseMimeType: "application/json"`
- Returns: `{ hookText, hookVisual, fullScript, analysis: { hook, script, visual, insights, hookType } }`

### `src/lib/integrations/runware.ts`
URL: `https://api.runware.ai/v1` | Auth: `Authorization: Bearer RUNWARE_API_KEY`

**`generateImage(prompt, options?)`** → `string` (image URL)
- Default: 1024×1024, model `"runware:100@1"`
- Optional: `negativePrompt`, `width`, `height`, `model`

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

## 10. UI Patterns (all `page.tsx` files)

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

## 11. Global State

### `src/components/layout/project-provider.tsx`
- Context: `{ projectId, projectName, setProject(id, name) }`
- Hook: `useCurrentProject()` — used in every page
- Persistence: cookie `currentProject` (30-day expiry)

### `src/components/layout/sidebar.tsx`
- 11 nav items: Dashboard, Projects, Accounts, Videos, Hooks, Scripts, Creators, Trends, Keywords, Hypotheses, Knowledge
- Collapsible (w-64 ↔ w-16), tooltips when collapsed

---

## 12. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `SCRAPECREATORS_API_KEY` | ScrapeCreators API auth | Yes |
| `GEMINI_API_KEY` | Google Gemini AI | Yes |
| `INNGEST_EVENT_KEY` | Inngest event publishing | Yes |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification | Yes |
| `RUNWARE_API_KEY` | Image generation | Optional |

---

## 13. Key Conventions

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
