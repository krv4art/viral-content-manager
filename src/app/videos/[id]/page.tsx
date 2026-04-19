"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { getVideo, toggleBookmark, updateAnalysis, updateVideo } from "@/actions/videos";
import { formatNumber, formatPercent, formatDate, formatDuration } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface VideoData {
  id: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  type: string;
  viewsCount: number | null;
  likesCount: number | null;
  commentsCount: number | null;
  sharesCount: number | null;
  savesCount: number | null;
  engagementRate: number | null;
  durationSeconds: number | null;
  postedAt: Date | null;
  isAnalyzed: boolean;
  isBookmarked: boolean;
  hookText: string | null;
  hookVisual: string | null;
  fullScript: string | null;
  analysis: Record<string, unknown> | null;
  notes: string | null;
  tags: string[];
  hashtags: string[];
  account: { id: string; username: string; displayName: string | null; platform: string };
  hooks: Array<Record<string, unknown>>;
  scripts: Array<Record<string, unknown>>;
}

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchVideo = useCallback(async () => {
    const res = await getVideo(videoId);
    if (res.success && res.data) {
      setVideoData(res.data as unknown as VideoData);
      setNotes(res.data.notes || "");
    }
    setLoading(false);
  }, [videoId]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  const handleToggleBookmark = async () => {
    const res = await toggleBookmark(videoId);
    if (res.success && res.data && video) {
      setVideoData({
        ...video,
        isBookmarked: (res.data as { isBookmarked: boolean }).isBookmarked,
      });
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateVideo(videoId, { notes });
    if (res.success) {
      toast.success("Заметки сохранены");
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSavingNotes(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    toast.info("Анализ видео запущен. Это может занять некоторое время.");
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Видео не найдено</p>
      </div>
    );
  }

  const account = video.account;
  const hooks = video.hooks || [];
  const scripts = video.scripts || [];
  const analysis = video.analysis;

  const metrics = [
    { label: "Просмотры", value: formatNumber(video.viewsCount) },
    { label: "Лайки", value: formatNumber(video.likesCount) },
    { label: "Комментарии", value: formatNumber(video.commentsCount) },
    { label: "Репосты", value: formatNumber(video.sharesCount) },
    { label: "Сохранения", value: formatNumber(video.savesCount) },
    { label: "ER", value: formatPercent(video.engagementRate) },
    { label: "Длительность", value: formatDuration(video.durationSeconds) },
    { label: "Дата публикации", value: formatDate(video.postedAt) },
  ];

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/videos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {video.description?.slice(0, 60) || "Видео"}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{account.username} / {account.platform}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleBookmark}
          >
            {video.isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              Открыть
            </Button>
          </a>
          {!video.isAnalyzed && (
            <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
              <Sparkles className="mr-1 h-4 w-4" />
              {analyzing ? "Анализ..." : "Анализировать"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-[9/16] bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground">Нет превью</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Метрики</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="font-medium">{m.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-1">
            {(video.hashtags || []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {video.isAnalyzed && (
            <>
              {video.hookText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Хук (текст)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {video.hookText}
                    </p>
                  </CardContent>
                </Card>
              )}

              {video.hookVisual && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Хук (визуал)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {video.hookVisual}
                    </p>
                  </CardContent>
                </Card>
              )}

              {video.fullScript && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Полный сценарий</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {video.fullScript}
                    </p>
                  </CardContent>
                </Card>
              )}

              {analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI-анализ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded">
                      {JSON.stringify(analysis, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {hooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Хуки из видео ({hooks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hooks.map((hook) => (
                  <div
                    key={String(hook.id)}
                    className="rounded-md border p-3"
                  >
                    <p className="text-sm">{String(hook.text)}</p>
                    {!!hook.hookType && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {String(hook.hookType)}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {scripts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Сценарии ({scripts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scripts.map((script) => (
                  <div
                    key={String(script.id)}
                    className="rounded-md border p-3"
                  >
                    <p className="font-medium text-sm">
                      {String(script.title)}
                    </p>
                    {!!script.fullText && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-5">
                        {String(script.fullText)}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Заметки</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Заметки о видео..."
            />
            <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm">
              {savingNotes ? "Сохранение..." : "Сохранить заметки"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
