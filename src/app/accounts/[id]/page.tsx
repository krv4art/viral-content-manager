"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { getAccount, updateAccount, triggerScrapeAccount } from "@/actions/accounts";
import { deleteVideo } from "@/actions/videos";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils/formatters";
import { TagInput } from "@/components/ui/tag-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const [account, setAccountData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [savingMeta, setSavingMeta] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAccount = useCallback(async () => {
    const res = await getAccount(accountId);
    if (res.success && res.data) {
      const data = res.data as unknown as Record<string, unknown>;
      setAccountData(data);
      setNotes((res.data as { notes?: string }).notes || "");
      setTags((res.data as { tags?: string[] }).tags || []);
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (!account) return;
    const status = account.scrapeStatus as string;
    if (status !== "in_progress") return;
    const interval = setInterval(() => {
      getAccount(accountId).then((res) => {
        if (res.success && res.data) {
          setAccountData(res.data as unknown as Record<string, unknown>);
          if ((res.data as { scrapeStatus: string }).scrapeStatus !== "in_progress") {
            setScraping(false);
          }
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [account, accountId]);

  const handleRefresh = async () => {
    setScraping(true);
    const res = await triggerScrapeAccount(accountId);
    if (res.success) {
      toast.success("Сбор данных запущен");
      setTimeout(fetchAccount, 2000);
    } else {
      toast.error("Ошибка запуска сбора");
      setScraping(false);
    }
  };

  const handleSaveMeta = async () => {
    setSavingMeta(true);
    const res = await updateAccount(accountId, { notes, tags });
    if (res.success) {
      toast.success("Сохранено");
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSavingMeta(false);
  };

  const toggleVideoSelect = (id: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllVideos = () => {
    setSelectedVideos((prev) => {
      const allIds = videos.map((v) => v.id as string);
      return prev.size === allIds.length ? new Set() : new Set(allIds);
    });
  };

  const handleDeleteSelectedVideos = async () => {
    setDeleting(true);
    const ids = Array.from(selectedVideos);
    await Promise.all(ids.map((id) => deleteVideo(id)));
    toast.success(`Удалено ${ids.length} видео`);
    setSelectedVideos(new Set());
    setDeleteDialogOpen(false);
    setDeleting(false);
    fetchAccount();
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Аккаунт не найден</p>
      </div>
    );
  }

  const videos = (account.videos as Array<Record<string, unknown>>) || [];
  const videoCount = (account._count as { videos: number })?.videos || 0;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {(account.displayName as string) || (account.username as string)}
        </h1>
        <Badge variant="secondary">{account.platform as string}</Badge>
        <Badge variant="outline">{account.category as string}</Badge>
        <div className="flex items-center gap-2 ml-2">
          <Switch
            checked={account.autoScrape as boolean}
            onCheckedChange={async (v) => {
              await updateAccount(accountId, { autoScrape: v });
              fetchAccount();
            }}
          />
          <span className="text-sm text-muted-foreground">Авто-скрейп</span>
        </div>
        {(account.scrapeStatus as string) === "in_progress" && (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Сбор данных...</Badge>
        )}
        {(account.scrapeStatus as string) === "error" && (
          <Badge variant="destructive">Ошибка сбора</Badge>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={scraping}>
            <RefreshCw className={`mr-2 h-4 w-4 ${scraping ? "animate-spin" : ""}`} />
            {scraping ? "Обновление..." : "Обновить данные"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
                {(account.username as string)?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {account.displayName as string}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{account.username as string}
                </p>
                {(account.bio as string) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {account.bio as string}
                  </p>
                )}
                <a
                  href={account.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Открыть профиль
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Подписчики</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.followersCount as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Подписки</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.followingCount as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ср. просмотры</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.avgViews as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ср. ER</p>
                <p className="text-xl font-bold">
                  {formatPercent(account.avgEngagementRate as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Видео</p>
                <p className="text-xl font-bold">{videoCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Последний сбор</p>
                <p className="text-sm font-medium">
                  {formatDate(account.lastScrapedAt as Date | null)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Видео ({videos.length})
          </h2>
          {selectedVideos.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить ({selectedVideos.size})
            </Button>
          )}
        </div>
        {videos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Нет видео с этого аккаунта
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={selectedVideos.size === videos.length && videos.length > 0}
                      onChange={toggleSelectAllVideos}
                    />
                  </TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-right">Просмотры</TableHead>
                  <TableHead className="text-right">Лайки</TableHead>
                  <TableHead className="text-right">ER</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow
                    key={video.id as string}
                    data-selected={selectedVideos.has(video.id as string)}
                    className="data-[selected=true]:bg-muted/50"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={selectedVideos.has(video.id as string)}
                        onChange={() => toggleVideoSelect(video.id as string)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      <Link
                        href={`/videos/${video.id}`}
                        className="hover:underline"
                      >
                        {(video.description as string) || "Без описания"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.viewsCount as number | null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.likesCount as number | null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(video.engagementRate as number | null)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(video.postedAt as Date | null)}
                    </TableCell>
                    <TableCell>
                      <a href={video.url as string} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Заметки и теги</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Теги</label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="фитнес, мотивация"
            />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Заметки об аккаунте..."
          />
          <Button onClick={handleSaveMeta} disabled={savingMeta} size="sm">
            {savingMeta ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить видео?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Будет удалено {selectedVideos.size} видео. Это действие необратимо.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelectedVideos} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
