import { getApiKey } from "@/lib/settings";

const BASE_URL = "https://api.scrapecreators.com";

async function getHeaders(): Promise<HeadersInit> {
  return {
    "x-api-key": await getApiKey("scrapecreatorsApiKey"),
    "Content-Type": "application/json",
  };
}

interface ScrapeProfileResult {
  displayName: string | null;
  bio: string | null;
  followersCount: number | null;
  followingCount: number | null;
  videosCount: number | null;
  avatarUrl: string | null;
  [key: string]: unknown;
}

interface ScrapeVideoResult {
  videoId: string;
  url: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewsCount: number | null;
  likesCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  savesCount: number | null;
  postedAt: string | null;
  hashtags: string[];
  musicName: string | null;
  [key: string]: unknown;
}

export async function scrapeAccountProfile(
  platform: string,
  username: string
): Promise<ScrapeProfileResult> {
  const isTikTok = platform.toLowerCase() === "tiktok";
  const endpoint = isTikTok ? "/v1/tiktok/profile" : "/v1/instagram/profile";

  const url = new URL(endpoint, BASE_URL);
  url.searchParams.set("handle", username.replace(/^@/, ""));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await getHeaders(),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ScrapeCreators profile request failed: ${response.status} ${response.statusText} — ${body}`
    );
  }

  const data = await response.json();

  if (data.account_deactivated || data.message === "Account doesn't exist") {
    throw new Error(`Account not found or deactivated: ${username}`);
  }

  if (isTikTok) {
    const user = data.userInfo?.user ?? data.user ?? data;
    const stats = data.userInfo?.stats ?? data.stats ?? data;
    return {
      displayName: user.nickname ?? user.uniqueId ?? null,
      bio: user.signature ?? null,
      followersCount: stats.followerCount ?? null,
      followingCount: stats.followingCount ?? stats.friendCount ?? null,
      videosCount: stats.videoCount ?? null,
      avatarUrl: user.avatarLarger ?? user.avatarMedium ?? null,
      ...data,
    };
  } else {
    // Instagram: profile endpoint returns user object directly or wrapped
    const user = data.graphql?.user ?? data.user ?? data;
    return {
      displayName: user.full_name ?? user.username ?? null,
      bio: user.biography ?? null,
      followersCount: user.edge_followed_by?.count ?? user.follower_count ?? null,
      followingCount: user.edge_follow?.count ?? user.following_count ?? null,
      videosCount: user.edge_owner_to_timeline_media?.count ?? null,
      avatarUrl: user.profile_pic_url_hd ?? user.profile_pic_url ?? null,
      ...data,
    };
  }
}

export async function scrapeSingleVideo(
  platform: string,
  videoId: string,
  videoUrl?: string
): Promise<ScrapeVideoResult | null> {
  const platformLower = platform.toLowerCase();

  if (platformLower === "instagram") {
    return scrapeSingleInstagramVideo(videoId, videoUrl);
  }

  if (platformLower !== "tiktok") return null;

  // try by URL first (more reliable), then by aweme_id
  const attempts = [
    ...(videoUrl ? [{ key: "url", val: videoUrl }] : []),
    { key: "aweme_id", val: videoId },
  ];

  let data: Record<string, unknown> | null = null;

  for (const attempt of attempts) {
    try {
      const reqUrl = new URL("/v1/tiktok/video", BASE_URL);
      reqUrl.searchParams.set(attempt.key, attempt.val);
      console.log(`[scrapeSingleVideo] trying ${reqUrl.toString()}`);

      const response = await fetch(reqUrl.toString(), {
        method: "GET",
        headers: await getHeaders(),
        signal: AbortSignal.timeout(25000),
      });

      console.log(`[scrapeSingleVideo] status: ${response.status}`);
      const bodyText = await response.text();
      console.log(`[scrapeSingleVideo] body preview: ${bodyText.slice(0, 300)}`);

      if (!response.ok) continue;

      const body = JSON.parse(bodyText) as Record<string, unknown>;
      if (body.aweme_detail || (body.itemInfo as Record<string, unknown> | undefined)?.itemStruct || body.video) {
        data = body;
        break;
      }
    } catch (e) {
      console.error(`[scrapeSingleVideo] attempt failed:`, e);
    }
  }

  if (!data) return null;
  const v = (data.aweme_detail ?? (data.itemInfo as Record<string, unknown> | undefined)?.itemStruct ?? data.video ?? data) as Record<string, unknown>;
  if (!v || !v.aweme_id) return null;

  const stats = (v.statistics ?? v.stats ?? {}) as Record<string, unknown>;
  const music = v.music as Record<string, unknown> | undefined;
  const videoMeta = v.video as Record<string, unknown> | undefined;
  const challenges = (v.text_extra ?? v.challenges ?? v.hashtags ?? []) as Array<Record<string, unknown>>;
  const playUrls = (videoMeta?.play_addr as Record<string, unknown> | undefined)?.url_list as string[] | undefined;

  const resolvedId = String(v.aweme_id ?? videoId);
  const author = (v.author as Record<string, unknown> | undefined)?.uniqueId ?? (v.author as Record<string, unknown> | undefined)?.unique_id;
  return {
    videoId: resolvedId,
    url: author
      ? `https://www.tiktok.com/@${author}/video/${resolvedId}`
      : String(v.webVideoUrl ?? v.url ?? ""),
    description: (v.desc ?? v.description ?? null) as string | null,
    thumbnailUrl: ((videoMeta?.dynamic_cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined)?.[0]
      ?? ((videoMeta?.origin_cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined)?.[0]
      ?? null,
    durationSeconds: (videoMeta?.duration ?? v.durationSeconds ?? null) as number | null,
    viewsCount: (stats.play_count ?? stats.playCount ?? null) as number | null,
    likesCount: (stats.digg_count ?? stats.diggCount ?? null) as number | null,
    commentsCount: (stats.comment_count ?? stats.commentCount ?? null) as number | null,
    sharesCount: (stats.share_count ?? stats.shareCount ?? null) as number | null,
    savesCount: (stats.collect_count ?? stats.collectCount ?? null) as number | null,
    postedAt: v.create_time ?? v.createTime
      ? new Date(Number(v.create_time ?? v.createTime) * 1000).toISOString()
      : null,
    hashtags: challenges
      .map((c) => String(c.hashtag_name ?? c.title ?? c.name ?? ""))
      .filter(Boolean),
    musicName: (music?.title ?? music?.name ?? null) as string | null,
  };
}

async function scrapeSingleInstagramVideo(
  videoId: string,
  videoUrl?: string
): Promise<ScrapeVideoResult | null> {
  const attempts: Array<{ endpoint: string; param: string; val: string }> = [];

  if (videoUrl) {
    attempts.push({ endpoint: "/v1/instagram/post", param: "url", val: videoUrl });
    attempts.push({ endpoint: "/v1/instagram/reel", param: "url", val: videoUrl });
  }
  attempts.push({ endpoint: "/v1/instagram/post", param: "shortcode", val: videoId });

  for (const attempt of attempts) {
    try {
      const reqUrl = new URL(attempt.endpoint, BASE_URL);
      reqUrl.searchParams.set(attempt.param, attempt.val);
      console.log(`[scrapeSingleInstagramVideo] trying ${reqUrl.toString()}`);

      const response = await fetch(reqUrl.toString(), {
        method: "GET",
        headers: await getHeaders(),
        signal: AbortSignal.timeout(25000),
      });

      console.log(`[scrapeSingleInstagramVideo] status: ${response.status}`);
      const bodyText = await response.text();
      console.log(`[scrapeSingleInstagramVideo] body preview: ${bodyText.slice(0, 300)}`);

      if (!response.ok) continue;

      const body = JSON.parse(bodyText) as Record<string, unknown>;
      const graphql = body.graphql as Record<string, unknown> | undefined;
      const items = body.items
        ? (body.items as Array<Record<string, unknown>>)
        : body.item
          ? [body.item as Record<string, unknown>]
          : graphql?.shortcode_media
            ? [graphql.shortcode_media as Record<string, unknown>]
            : [body];

      for (const v of items) {
        const pk = String(v.pk ?? v.id ?? "");
        if (!pk) continue;

        const caption = v.caption as Record<string, unknown> | null;
        const imageVersions = v.image_versions2 as Record<string, unknown> | undefined;
        const candidates = (imageVersions?.candidates as Array<Record<string, unknown>> | undefined) ?? [];

        return {
          videoId: pk,
          url: String(v.video_url ?? v.url ?? ""),
          description: (caption?.text ?? v.caption_text ?? null) as string | null,
          thumbnailUrl: (candidates[0]?.url ?? v.thumbnail_url ?? null) as string | null,
          durationSeconds: (v.video_duration ?? v.duration ?? null) as number | null,
          viewsCount: (v.play_count ?? v.view_count ?? null) as number | null,
          likesCount: (v.like_count ?? null) as number | null,
          commentsCount: (v.comment_count ?? null) as number | null,
          sharesCount: (v.share_count ?? null) as number | null,
          savesCount: (v.save_count ?? null) as number | null,
          postedAt: v.taken_at
            ? new Date(Number(v.taken_at) * 1000).toISOString()
            : null,
          hashtags: [],
          musicName: null,
        };
      }
    } catch (e) {
      console.error(`[scrapeSingleInstagramVideo] attempt failed:`, e);
    }
  }

  return null;
}

export async function scrapeAccountVideos(
  platform: string,
  username: string,
  limit?: number
): Promise<ScrapeVideoResult[]> {
  const isTikTok = platform.toLowerCase() === "tiktok";

  if (isTikTok) {
    return scrapeTikTokVideos(username, limit);
  } else {
    return scrapeInstagramReels(username, limit);
  }
}

async function scrapeTikTokVideos(
  username: string,
  limit?: number
): Promise<ScrapeVideoResult[]> {
  const url = new URL("/v3/tiktok/profile/videos", BASE_URL);
  url.searchParams.set("handle", username.replace(/^@/, ""));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await getHeaders(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ScrapeCreators TikTok videos request failed: ${response.status} ${response.statusText} — ${body}`
    );
  }

  const data = await response.json();
  const rawVideos: Record<string, unknown>[] = data.aweme_list ?? data.videos ?? data.itemList ?? [];
  const sliced = limit ? rawVideos.slice(0, limit) : rawVideos;

  return sliced.map((v) => {
    const stats = (v.statistics ?? v.stats ?? {}) as Record<string, unknown>;
    const music = v.music as Record<string, unknown> | undefined;
    const videoMeta = v.video as Record<string, unknown> | undefined;
    const challenges = (v.text_extra ?? v.challenges ?? v.hashtags ?? []) as Array<Record<string, unknown>>;
    const vid = String(v.aweme_id ?? v.id ?? v.videoId ?? "");
    return {
      videoId: vid,
      url: vid ? `https://www.tiktok.com/@${username.replace(/^@/, "")}/video/${vid}` : String(v.url ?? v.webVideoUrl ?? ""),
      description: (v.desc ?? v.description ?? null) as string | null,
      thumbnailUrl: ((videoMeta?.dynamic_cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined)?.[0]
        ?? ((videoMeta?.origin_cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined)?.[0]
        ?? null,
      durationSeconds: (videoMeta?.duration ?? v.durationSeconds ?? null) as number | null,
      viewsCount: (stats.play_count ?? stats.playCount ?? null) as number | null,
      likesCount: (stats.digg_count ?? stats.diggCount ?? null) as number | null,
      commentsCount: (stats.comment_count ?? stats.commentCount ?? null) as number | null,
      sharesCount: (stats.share_count ?? stats.shareCount ?? null) as number | null,
      savesCount: (stats.collect_count ?? stats.collectCount ?? null) as number | null,
      postedAt: v.create_time ?? v.createTime
        ? new Date(Number(v.create_time ?? v.createTime) * 1000).toISOString()
        : null,
      hashtags: challenges
        .map((c) => String(c.hashtag_name ?? c.title ?? c.name ?? ""))
        .filter(Boolean),
      musicName: (music?.title ?? music?.name ?? null) as string | null,
    };
  });
}

async function scrapeInstagramReels(
  username: string,
  limit?: number
): Promise<ScrapeVideoResult[]> {
  const url = new URL("/v1/instagram/user/reels", BASE_URL);
  url.searchParams.set("handle", username.replace(/^@/, ""));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await getHeaders(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ScrapeCreators Instagram reels request failed: ${response.status} ${response.statusText} — ${body}`
    );
  }

  const data = await response.json();
  const rawItems: Record<string, unknown>[] =
    data.items ?? data.reels_media?.[0]?.items ?? data ?? [];
  const sliced = limit ? rawItems.slice(0, limit) : rawItems;

  return sliced.map((v) => {
    const caption = (v.caption as Record<string, unknown> | null);
    const imageVersions = v.image_versions2 as Record<string, unknown> | undefined;
    const candidates = (imageVersions?.candidates as Array<Record<string, unknown>> | undefined) ?? [];

    return {
      videoId: String(v.pk ?? v.id ?? ""),
      url: String(v.video_url ?? v.url ?? ""),
      description: (caption?.text ?? null) as string | null,
      thumbnailUrl: (candidates[0]?.url ?? v.thumbnail_url ?? null) as string | null,
      durationSeconds: (v.video_duration ?? v.duration ?? null) as number | null,
      viewsCount: (v.play_count ?? v.view_count ?? null) as number | null,
      likesCount: (v.like_count ?? null) as number | null,
      commentsCount: (v.comment_count ?? null) as number | null,
      sharesCount: (v.share_count ?? null) as number | null,
      savesCount: (v.save_count ?? null) as number | null,
      postedAt: v.taken_at
        ? new Date(Number(v.taken_at) * 1000).toISOString()
        : (v.postedAt as string | null) ?? null,
      hashtags: [],
      musicName: (
        (v.clips_metadata as Record<string, unknown> | undefined)?.music_info
          ? String(((v.clips_metadata as Record<string, unknown>).music_info as Record<string, unknown>)?.music_asset_info
              ? (((v.clips_metadata as Record<string, unknown>).music_info as Record<string, unknown>).music_asset_info as Record<string, unknown>)?.display_artist ?? ""
              : "")
          : null
      ) as string | null,
    };
  });
}
