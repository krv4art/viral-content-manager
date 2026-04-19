"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { getVideos, createVideo, toggleBookmark, triggerBatchAnalyze } from "@/actions/videos";
import { getAccounts } from "@/actions/accounts";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type VideoItem = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  description: string | null;
  viewsCount: number | null;
  likesCount: number | null;
  engagementRate: number | null;
  postedAt: Date | null;
  type: string;
  isBookmarked: boolean;
  account: {
    id: string;
    username: string;
    displayName: string | null;
    platform: string;
  };
};

type AccountOption = {
  id: string;
  username: string;
  platform: string;
};

export default function VideosPage() {
  const { projectId } = useCurrentProject();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBookmarked, setFilterBookmarked] = useState(false);

  const setFilterAndReset = {
    account: (v: string) => { setFilterAccount(v); setPage(0); },
    type: (v: string) => { setFilterType(v); setPage(0); },
    bookmarked: () => { setFilterBookmarked((b) => !b); setPage(0); },
  };
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [formUrl, setFormUrl] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formType, setFormType] = useState("video");

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchAccountId, setBatchAccountId] = useState("");
  const [batchLimit, setBatchLimit] = useState(10);
  const [batchSaving, setBatchSaving] = useState(false);

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchVideos = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getVideos(projectId, {
      accountId: filterAccount !== "all" ? filterAccount : undefined,
      type: filterType !== "all" ? filterType : undefined,
      isBookmarked: filterBookmarked ? true : undefined,
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });
    if (res.success && res.data) {
      setVideos(res.data as unknown as VideoItem[]);
      setTotal((res as unknown as { total: number }).total ?? 0);
    }
    setLoading(false);
  }, [projectId, filterAccount, filterType, filterBookmarked, page]);

  const fetchAccounts = useCallback(async () => {
    if (!projectId) return;
    const accRes = await getAccounts(projectId);
    if (accRes.success && accRes.data) {
      setAccounts(
        (accRes.data as unknown as Array<Record<string, unknown>>).map(
          (a) => ({
            id: a.id as string,
            username: a.username as string,
            platform: a.platform as string,
          })
        )
      );
    }
  }, [projectId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortField];
    const bVal = (b as Record<string, unknown>)[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDir === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  const handleCreate = async () => {
    if (!formUrl.trim() || !formAccountId) {
      toast.error("Заполните все поля");
      return;
    }
    setSaving(true);
    const selectedAccount = accounts.find((a) => a.id === formAccountId);
    const videoIdMatch = formUrl.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : Date.now().toString();

    const res = await createVideo({
      accountId: formAccountId,
      platform: selectedAccount?.platform || "tiktok",
      videoId,
      url: formUrl,
      type: formType,
    });
    if (res.success) {
      toast.success("Видео добавлено");
      setDialogOpen(false);
      setFormUrl("");
      fetchVideos();
    } else {
      toast.error("Ошибка при добавлении видео");
    }
    setSaving(false);
  };

  const handleBatchAnalyze = async () => {
    if (!batchAccountId) {
      toast.error("Выберите аккаунт");
      return;
    }
    setBatchSaving(true);
    const res = await triggerBatchAnalyze(batchAccountId, batchLimit);
    if (res.success) {
      toast.success(`Анализ топ-${batchLimit} видео запущен`);
      setBatchDialogOpen(false);
    } else {
      toast.error("Ошибка при запуске анализа");
    }
    setBatchSaving(false);
  };

  const handleToggleBookmark = async (videoId: string) => {
    const res = await toggleBookmark(videoId);
    if (res.success) {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, isBookmarked: !v.isBookmarked }
            : v
        )
      );
    } else {
      toast.error("Не удалось изменить избранное");
    }
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра видео</p>
      </div>
    );
  }

  const SortButton = ({ field }: { field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="ml-1 h-5 w-5"
      onClick={() => handleSort(field)}
    >
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Видео</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Анализировать топ-10
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить видео
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterAccount} onValueChange={setFilterAndReset.account}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Аккаунт" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все аккаунты</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                @{a.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterAndReset.type}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="video">Видео</SelectItem>
            <SelectItem value="reel">Reel</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={filterBookmarked ? "default" : "outline"}
          size="sm"
          onClick={setFilterAndReset.bookmarked}
        >
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          Избранное
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : sortedVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет видео</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить видео
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]" />
                <TableHead>Описание</TableHead>
                <TableHead className="text-right">
                  Просмотры
                  <SortButton field="viewsCount" />
                </TableHead>
                <TableHead className="text-right">Лайки</TableHead>
                <TableHead className="text-right">
                  ER
                  <SortButton field="engagementRate" />
                </TableHead>
                <TableHead>
                  Дата
                  <SortButton field="postedAt" />
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="h-10 w-14 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/videos/${video.id}`}
                      className="hover:underline"
                    >
                      <p className="max-w-[250px] truncate text-sm">
                        {video.description || "Без описания"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{video.account.username}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(video.viewsCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(video.likesCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(video.engagementRate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(video.postedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleBookmark(video.id)}
                      >
                        {video.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить видео</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Аккаунт</Label>
              <Select value={formAccountId} onValueChange={setFormAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аккаунт" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      @{a.username} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">URL видео</Label>
              <Input
                id="video-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://tiktok.com/@user/video/123..."
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Видео</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Анализировать топ-N видео</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Аккаунт</Label>
              <Select value={batchAccountId} onValueChange={setBatchAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аккаунт" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      @{a.username} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-limit">Количество видео (1–50)</Label>
              <Input
                id="batch-limit"
                type="number"
                min={1}
                max={50}
                value={batchLimit}
                onChange={(e) => setBatchLimit(Math.max(1, Math.min(50, Number(e.target.value))))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleBatchAnalyze} disabled={batchSaving}>
              {batchSaving ? "Запуск..." : "Запустить анализ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Video({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}
