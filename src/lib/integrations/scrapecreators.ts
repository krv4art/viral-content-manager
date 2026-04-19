const BASE_URL = "https://api.scrapecreators.com";

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.SCRAPECREATORS_API_KEY}`,
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
  const endpoint =
    platform.toLowerCase() === "tiktok"
      ? "/api/v1/tiktok/account"
      : "/api/v1/instagram/account";

  const url = new URL(endpoint, BASE_URL);
  url.searchParams.set("username", username);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `ScrapeCreators profile request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return {
    displayName: data.displayName ?? data.nickname ?? null,
    bio: data.bio ?? data.biography ?? null,
    followersCount: data.followersCount ?? data.followerCount ?? null,
    followingCount: data.followingCount ?? null,
    videosCount: data.videosCount ?? data.videoCount ?? null,
    avatarUrl: data.avatarUrl ?? data.profilePicUrl ?? null,
    ...data,
  };
}

export async function scrapeAccountVideos(
  platform: string,
  username: string,
  limit?: number
): Promise<ScrapeVideoResult[]> {
  const endpoint =
    platform.toLowerCase() === "tiktok"
      ? "/api/v1/tiktok/videos"
      : "/api/v1/instagram/videos";

  const url = new URL(endpoint, BASE_URL);
  url.searchParams.set("username", username);
  if (limit) {
    url.searchParams.set("limit", String(limit));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `ScrapeCreators videos request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const videos: ScrapeVideoResult[] = (data.videos ?? data ?? []).map(
    (v: Record<string, unknown>) => ({
      videoId: String(v.id ?? v.videoId ?? ""),
      url: String(v.url ?? v.webVideoUrl ?? ""),
      description: (v.description ?? v.caption ?? v.text ?? null) as
        | string
        | null,
      thumbnailUrl: (v.thumbnailUrl ?? v.coverUrl ?? v.imageUrl ?? null) as
        | string
        | null,
      durationSeconds: (v.durationSeconds ?? v.duration ?? null) as
        | number
        | null,
      viewsCount: (v.viewsCount ?? v.playCount ?? v.viewCount ?? null) as
        | number
        | null,
      likesCount: (v.likesCount ?? v.diggCount ?? null) as number | null,
      commentsCount: (v.commentsCount ?? v.commentCount ?? null) as
        | number
        | null,
      sharesCount: (v.sharesCount ?? v.shareCount ?? null) as number | null,
      savesCount: (v.savesCount ?? v.collectCount ?? null) as number | null,
      postedAt: (v.postedAt ?? v.createTime ?? v.createdAt ?? null) as
        | string
        | null,
      hashtags: (v.hashtags ?? v.challenges ?? []) as string[],
      musicName: (v.musicName ?? (v.music as Record<string, unknown> | undefined)?.name ?? null) as string | null,
      ...v,
    })
  );

  return videos;
}
