export function calculateEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  saves: number,
  views: number
): number {
  if (!views) return 0;
  return ((likes + comments + shares + saves) / views) * 100;
}

export function calculateAvgViews(views: number[]): number {
  if (!views.length) return 0;
  return Math.round(views.reduce((a, b) => a + b, 0) / views.length);
}

export function calculateMedianViews(views: number[]): number {
  if (!views.length) return 0;
  const sorted = [...views].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function calculateViralityScore(
  engagementRate: number,
  views: number,
  avgViews: number
): number {
  if (!avgViews) return 0;
  const viewMultiplier = views / avgViews;
  return Math.round(engagementRate * viewMultiplier * 10) / 10;
}
