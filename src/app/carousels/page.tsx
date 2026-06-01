"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  LayoutGrid,
  ExternalLink,
  Trash2,
  Images,
  Sparkles,
  BookmarkPlus,
} from "lucide-react";
import {
  getCarousels,
  createCarousel,
  deleteCarousel,
  triggerAnalyzeCarousel,
} from "@/actions/carousels";
import { getVideos } from "@/actions/videos";
import { useCurrentProject } from "@/components/layout/project-provider";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { formatDate } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Multiselect } from "@/components/ui/multiselect";

/** Strip query params, hash, and trailing slashes from TikTok/Instagram URLs. */
function cleanCarouselUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return raw.trim();
  }
}

/** Generate a readable title from a carousel URL. */
function titleFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname.includes("tiktok.com")) {
      // /@username/photo/ID or /@username/video/ID
      const m = pathname.match(/\/@([^/]+)\/(photo|video)\/(\d+)/);
      if (m) return `@${m[1]} · ${m[2]}`;
      const user = pathname.match(/\/@([^/]+)/);
      if (user) return `@${user[1]}`;
    }
    if (hostname.includes("instagram.com")) {
      const m = pathname.match(/\/(p|reel)\/([^/]+)/);
      if (m) return `instagram · ${m[1]}/${m[2]}`;
    }
    return url.slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Черновик" },
  { value: "ready", label: "Готов" },
  { value: "published", label: "Опубликован" },
];

const TYPE_OPTIONS = [
  { value: "reference", label: "Референс" },
  { value: "original", label: "Оригинал" },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Черновик" },
  ready: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Готов" },
  published: { color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Опубликован" },
};

const typeConfig: Record<string, { color: string; label: string }> = {
  reference: { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Референс" },
  original: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Оригинал" },
};

type CarouselItem = {
  id: string;
  title: string;
  status: string;
  carouselType: string;
  sourceUrl: string | null;
  formula: string | null;
  tags: string[];
  createdAt: Date | string;
  _count: { slides: number };
  video: { id: string; url: string; description: string | null } | null;
};

type VideoOption = { id: string; url: string; description: string | null };

export default function CarouselsPage() {
  const { projectId } = useCurrentProject();
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoOption[]>([]);

  const [filterStatus, setFilterStatus] = usePersistedState<string[]>("vb-carousels-status", []);
  const [filterType, setFilterType] = usePersistedState<string[]>("vb-carousels-type", []);

  const [form, setForm] = useState({
    title: "",
    sourceUrl: "",
    carouselType: "reference",
    notes: "",
    analyzeNow: true,
  });

  const [selectedVideoId, setSelectedVideoId] = useState("");

  const fetchCarousels = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const res = await getCarousels(projectId, {
      status: filterStatus.length > 0 ? filterStatus : undefined,
      carouselType: filterType.length > 0 ? filterType : undefined,
    });
    if (res.success) setCarousels(res.data as unknown as CarouselItem[]);
    setLoading(false);
  }, [projectId, filterStatus, filterType]);

  useEffect(() => { fetchCarousels(); }, [fetchCarousels]);

  const fetchCarouselVideos = useCallback(async () => {
    if (!projectId) return;
    const res = await getVideos(projectId, { type: "carousel" });
    if (res.success) setVideos(res.data as VideoOption[]);
  }, [projectId]);

  const handleQuickSave = async () => {
    if (!quickUrl.trim() || !projectId) return;
    const cleaned = cleanCarouselUrl(quickUrl);
    const title = titleFromUrl(cleaned);
    setQuickSaving(true);
    const res = await createCarousel({ projectId, title, carouselType: "reference", sourceUrl: cleaned });
    if (res.success) {
      toast.success(`Сохранено: ${title}`);
      setQuickUrl("");
      fetchCarousels();
    } else {
      toast.error(res.error ?? "Ошибка");
    }
    setQuickSaving(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Введите название"); return; }
    if (!projectId) return;
    setSaving(true);
    const res = await createCarousel({
      projectId,
      title: form.title.trim(),
      carouselType: form.carouselType,
      sourceUrl: form.sourceUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    if (res.success && res.data) {
      toast.success("Карусель создана");
      if (form.analyzeNow && (form.sourceUrl.trim())) {
        await triggerAnalyzeCarousel(res.data.id);
        toast.success("Анализ запущен");
      }
      setDialogOpen(false);
      setForm({ title: "", sourceUrl: "", carouselType: "reference", notes: "", analyzeNow: true });
      fetchCarousels();
    } else {
      toast.error(res.error ?? "Ошибка");
    }
    setSaving(false);
  };

  const handleCreateFromVideo = async () => {
    if (!selectedVideoId) { toast.error("Выберите видео"); return; }
    if (!projectId) return;
    const video = videos.find(v => v.id === selectedVideoId);
    if (!video) return;
    setSaving(true);
    const res = await createCarousel({
      projectId,
      title: video.description?.slice(0, 60) ?? "Карусель из видео",
      carouselType: "reference",
      videoId: selectedVideoId,
      sourceUrl: video.url,
    });
    if (res.success && res.data) {
      await triggerAnalyzeCarousel(res.data.id);
      toast.success("Карусель создана, анализ запущен");
      setVideoDialogOpen(false);
      setSelectedVideoId("");
      fetchCarousels();
    } else {
      toast.error(res.error ?? "Ошибка");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const res = await deleteCarousel(id);
    if (res.success) {
      toast.success("Карусель удалена");
      fetchCarousels();
    } else {
      toast.error(res.error ?? "Ошибка");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-zinc-400" />
          <h1 className="text-xl font-semibold text-zinc-100">Карусели</h1>
          {!loading && (
            <span className="text-sm text-zinc-500">({carousels.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Multiselect
            label="Тип"
            options={TYPE_OPTIONS}
            selected={filterType}
            onChange={setFilterType}
          />
          <Multiselect
            label="Статус"
            options={STATUS_OPTIONS}
            selected={filterStatus}
            onChange={setFilterStatus}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await fetchCarouselVideos(); setVideoDialogOpen(true); }}
          >
            <Images className="h-4 w-4 mr-2" />
            Из видео
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      {/* Quick Save bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <BookmarkPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <Input
            className="pl-9 bg-zinc-900 border-zinc-700"
            placeholder="Вставь ссылку на карусель TikTok или Instagram..."
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted.includes("tiktok.com") || pasted.includes("instagram.com")) {
                e.preventDefault();
                setQuickUrl(cleanCarouselUrl(pasted));
              }
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickSave(); }}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleQuickSave}
          disabled={quickSaving || !quickUrl.trim()}
          className="shrink-0"
        >
          {quickSaving ? "Сохраняем..." : "Сохранить"}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : carousels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutGrid className="h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-2">Нет каруселей</p>
          <p className="text-sm text-zinc-500 mb-6">
            Создайте карусель вручную или из спарсенного видео
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать карусель
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carousels.map((c) => {
            const status = statusConfig[c.status] ?? statusConfig.draft;
            const type = typeConfig[c.carouselType] ?? typeConfig.reference;
            return (
              <div
                key={c.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/carousels/${c.id}`}
                    className="text-sm font-medium text-zinc-100 hover:text-white line-clamp-2 flex-1"
                  >
                    {c.title}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/carousels/${c.id}`}>Открыть</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="text-red-400 focus:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${type.color}`}>
                    {type.label}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${status.color}`}>
                    {status.label}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {c._count.slides} слайдов
                  </span>
                </div>

                {c.formula && (
                  <p className="text-xs text-zinc-400 line-clamp-2">{c.formula}</p>
                )}

                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs text-zinc-600">{formatDate(c.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {c.sourceUrl && (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Link href={`/carousels/${c.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                        Открыть
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новая карусель</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                placeholder="Например: How to be productive — формула"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={form.carouselType}
                onValueChange={(v) => setForm((f) => ({ ...f, carouselType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reference">Референс (карусель конкурента)</SelectItem>
                  <SelectItem value="original">Оригинал (моя карусель)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL карусели (TikTok/Instagram)</Label>
              <Input
                placeholder="https://www.tiktok.com/@..."
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              />
              <p className="text-xs text-zinc-500">
                Если указан, Gemini автоматически извлечёт слайды и формулу
              </p>
            </div>
            {form.sourceUrl.trim() && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="analyzeNow"
                  checked={form.analyzeNow}
                  onChange={(e) => setForm((f) => ({ ...f, analyzeNow: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="analyzeNow" className="text-sm text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Запустить анализ сразу
                </label>
              </div>
            )}
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                placeholder="Откуда взяли, что понравилось..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Создаём..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create from video dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Карусель из видео</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Выберите видео типа «carousel» из базы — Gemini проанализирует его слайды.
            </p>
            {videos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Нет спарсенных видео типа carousel. Спарсите аккаунты с каруселями.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {videos.map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedVideoId === v.id
                        ? "border-zinc-500 bg-zinc-800"
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="video"
                      value={v.id}
                      checked={selectedVideoId === v.id}
                      onChange={() => setSelectedVideoId(v.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 line-clamp-2">
                        {v.description ?? v.url}
                      </p>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Открыть
                      </a>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateFromVideo} disabled={saving || !selectedVideoId || videos.length === 0}>
              {saving ? "Создаём..." : "Создать и анализировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
