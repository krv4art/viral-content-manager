export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  if (num < 0) return `-${formatNumber(-num)}`;

  if (num >= 1_000_000_000) {
    const value = num / 1_000_000_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    const value = num / 1_000_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}M`;
  }
  if (num >= 1_000) {
    const value = num / 1_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K`;
  }

  return num.toString();
}

export function formatDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "—";

  const months = [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ];

  const day = d.getDate().toString().padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0%";
  return `${value.toFixed(1)}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return formatDate(d);
  if (diffDays > 0) return `${diffDays}д назад`;
  if (diffHours > 0) return `${diffHours}ч назад`;
  if (diffMinutes > 0) return `${diffMinutes}м назад`;
  return "только что";
}
