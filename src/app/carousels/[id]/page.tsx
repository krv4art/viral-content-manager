"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Wand2,
  Sparkles,
  Image,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Save,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  getCarousel,
  updateCarousel,
  deleteCarousel,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  generateSlideImage,
  scrapeCarouselSlides,
  triggerAnalyzeCarousel,
  triggerAdaptCarousel,
} from "@/actions/carousels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "draft", label: "Черновик" },
  { value: "ready", label: "Готов" },
  { value: "published", label: "Опубликован" },
];

const SLIDE_TYPES = [
  { value: "cover", label: "Обложка" },
  { value: "body", label: "Слайд" },
  { value: "cta", label: "CTA" },
];

const slideTypeColors: Record<string, string> = {
  cover: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  body: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  cta: "bg-green-500/10 text-green-400 border-green-500/20",
};

type Slide = {
  id: string;
  carouselId: string;
  order: number;
  slideType: string;
  text: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  notes: string | null;
};

type CarouselDetail = {
  id: string;
  title: string;
  status: string;
  carouselType: string;
  formula: string | null;
  sourceUrl: string | null;
  analysisStatus: string;
  analysisError: string | null;
  tags: string[];
  notes: string | null;
  slides: Slide[];
  video: { id: string; url: string; description: string | null } | null;
};

/** TikTok CDN blocks hotlinking — route those images through our proxy. */
function slideImageSrc(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".tiktokcdn.com") || host.endsWith(".tiktokcdn-us.com")) {
      return `/api/proxy/tiktok-image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

export default function CarouselDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [carousel, setCarousel] = useState<CarouselDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [generatingSlide, setGeneratingSlide] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [editFormula, setEditFormula] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [slideEdits, setSlideEdits] = useState<
    Record<string, { text: string; imagePrompt: string; slideType: string; notes: string }>
  >({});

  const fetchCarousel = useCallback(async () => {
    const res = await getCarousel(id);
    if (res.success && res.data) {
      const c = res.data as CarouselDetail;
      setCarousel(c);
      setEditTitle(c.title);
      setEditStatus(c.status);
      setEditFormula(c.formula ?? "");
      setEditSourceUrl(c.sourceUrl ?? "");
      setEditNotes(c.notes ?? "");
      const edits: typeof slideEdits = {};
      c.slides.forEach((s) => {
        edits[s.id] = {
          text: s.text ?? "",
          imagePrompt: s.imagePrompt ?? "",
          slideType: s.slideType,
          notes: s.notes ?? "",
        };
      });
      setSlideEdits(edits);
    } else {
      toast.error("Карусель не найдена");
      router.push("/carousels");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchCarousel();
  }, [fetchCarousel]);

  // Poll while Gemini analysis is running in the background.
  useEffect(() => {
    if (carousel?.analysisStatus !== "analyzing") return;
    const interval = setInterval(fetchCarousel, 4000);
    return () => clearInterval(interval);
  }, [carousel?.analysisStatus, fetchCarousel]);

  const saveHeader = async () => {
    setSavingField("header");
    const res = await updateCarousel(id, {
      title: editTitle,
      status: editStatus,
      formula: editFormula,
      sourceUrl: editSourceUrl,
      notes: editNotes,
    });
    if (res.success) toast.success("Сохранено");
    else toast.error(res.error ?? "Ошибка");
    setSavingField(null);
  };

  // Step 1: scrape slide images via ScrapeCreators (costs credits, run once).
  const handleScrapeSlides = async () => {
    const url = editSourceUrl.trim() || carousel?.video?.url;
    if (!url) {
      toast.error("Укажите URL карусели или привяжите видео");
      return;
    }
    if (editSourceUrl.trim() && editSourceUrl.trim() !== carousel?.sourceUrl) {
      await updateCarousel(id, { sourceUrl: editSourceUrl.trim() });
    }
    setScraping(true);
    const res = await scrapeCarouselSlides(id);
    if (res.success && res.data) {
      toast.success(`Спарсено слайдов: ${res.data.count}`);
      await fetchCarousel();
    } else {
      toast.error(res.error ?? "Ошибка скрейпа");
    }
    setScraping(false);
  };

  // Step 2: analyze already-scraped slide images with Gemini (no re-scrape).
  const handleAnalyze = async () => {
    const url = editSourceUrl.trim() || carousel?.video?.url;
    if (!url) {
      toast.error("Укажите URL карусели или привяжите видео");
      return;
    }
    if (editSourceUrl.trim() && editSourceUrl.trim() !== carousel?.sourceUrl) {
      await updateCarousel(id, { sourceUrl: editSourceUrl.trim() });
    }
    setAnalyzing(true);
    const res = await triggerAnalyzeCarousel(id);
    if (res.success) {
      toast.success("Анализ запущен (Gemini). Тексты и формула появятся через несколько секунд.");
      await fetchCarousel();
    } else {
      toast.error(res.error ?? "Ошибка запуска анализа");
    }
    setAnalyzing(false);
  };

  const handleAdapt = async () => {
    if (!carousel?.slides.length) {
      toast.error("Сначала проанализируйте карусель — нужны слайды");
      return;
    }
    setAdapting(true);
    const res = await triggerAdaptCarousel(id);
    if (res.success) {
      toast.success("Адаптация запущена. Новая карусель появится через несколько секунд.");
      setTimeout(() => router.push("/carousels"), 10000);
    } else {
      toast.error(res.error ?? "Ошибка запуска адаптации");
    }
    setAdapting(false);
  };

  const saveSlide = async (slideId: string) => {
    const edit = slideEdits[slideId];
    if (!edit) return;
    setSavingField(slideId);
    const res = await updateSlide(slideId, {
      text: edit.text,
      imagePrompt: edit.imagePrompt,
      slideType: edit.slideType,
      notes: edit.notes,
    });
    if (!res.success) toast.error(res.error ?? "Ошибка сохранения слайда");
    setSavingField(null);
  };

  const handleGenerateImage = async (slideId: string) => {
    const prompt = slideEdits[slideId]?.imagePrompt;
    if (!prompt?.trim()) {
      toast.error("Заполните промпт для изображения");
      return;
    }
    await saveSlide(slideId);
    setGeneratingSlide(slideId);
    const res = await generateSlideImage(slideId);
    if (res.success && res.data) {
      setCarousel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slides: prev.slides.map((s) =>
            s.id === slideId ? { ...s, imageUrl: res.data!.imageUrl } : s
          ),
        };
      });
      toast.success("Изображение сгенерировано");
    } else {
      toast.error(res.error ?? "Ошибка генерации");
    }
    setGeneratingSlide(null);
  };

  const handleAddSlide = async () => {
    const maxOrder = carousel?.slides.reduce((m, s) => Math.max(m, s.order), 0) ?? 0;
    const res = await createSlide(id, { order: maxOrder + 1 });
    if (res.success) {
      fetchCarousel();
    } else {
      toast.error(res.error ?? "Ошибка");
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    const res = await deleteSlide(slideId);
    if (res.success) {
      setCarousel((prev) =>
        prev ? { ...prev, slides: prev.slides.filter((s) => s.id !== slideId) } : prev
      );
      const newEdits = { ...slideEdits };
      delete newEdits[slideId];
      setSlideEdits(newEdits);
    } else {
      toast.error(res.error ?? "Ошибка");
    }
  };

  const handleMoveSlide = async (slideId: string, direction: "up" | "down") => {
    if (!carousel) return;
    const slides = [...carousel.slides];
    const idx = slides.findIndex((s) => s.id === slideId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === slides.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [slides[idx], slides[swapIdx]] = [slides[swapIdx], slides[idx]];
    const orderedIds = slides.map((s) => s.id);
    setCarousel((prev) =>
      prev ? { ...prev, slides: slides.map((s, i) => ({ ...s, order: i + 1 })) } : prev
    );
    await reorderSlides(id, orderedIds);
  };

  const handleDeleteCarousel = async () => {
    const res = await deleteCarousel(id);
    if (res.success) {
      router.push("/carousels");
    } else {
      toast.error(res.error ?? "Ошибка");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!carousel) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/carousels">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-zinc-100 truncate">{carousel.title}</h1>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 ${
            carousel.carouselType === "original"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
          }`}
        >
          {carousel.carouselType === "original" ? "Оригинал" : "Референс"}
        </Badge>
      </div>

      {/* Settings block */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-medium text-zinc-300">Основное</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrapeSlides}
              disabled={scraping || analyzing}
              title="Шаг 1: спарсить картинки слайдов через ScrapeCreators (тратит кредиты)"
            >
              {scraping ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-2" />
              )}
              1. Спарсить слайды
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing || scraping || carousel.analysisStatus === "analyzing"}
              title="Шаг 2: анализ текстов и формулы через Gemini (по уже спарсенным картинкам)"
            >
              {analyzing || carousel.analysisStatus === "analyzing" ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 mr-2" />
              )}
              2. Анализ (Gemini)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdapt}
              disabled={adapting}
            >
              {adapting ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-2" />
              )}
              Адаптировать
            </Button>
            <Button
              size="sm"
              onClick={saveHeader}
              disabled={savingField === "header"}
            >
              {savingField === "header" ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-2" />
              )}
              Сохранить
            </Button>
          </div>
        </div>

        {/* Analysis status banner */}
        {carousel.analysisStatus === "analyzing" && (
          <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Gemini анализирует слайды… тексты и формула появятся автоматически.
          </div>
        )}
        {carousel.analysisStatus === "scraped" && (
          <div className="flex items-center gap-2 rounded-md border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm text-purple-300">
            <Download className="h-4 w-4 shrink-0" />
            Слайды спарсены. Нажмите «2. Анализ (Gemini)», чтобы извлечь тексты и формулу.
          </div>
        )}
        {carousel.analysisStatus === "error" && carousel.analysisError && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="break-words">{carousel.analysisError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL карусели</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://www.tiktok.com/@..."
              value={editSourceUrl}
              onChange={(e) => setEditSourceUrl(e.target.value)}
              className="flex-1"
            />
            {editSourceUrl && (
              <a
                href={editSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Формула</Label>
          <Textarea
            placeholder="AI извлечёт формулу после анализа..."
            value={editFormula}
            onChange={(e) => setEditFormula(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Заметки</Label>
          <Textarea
            placeholder="Заметки, источник, идеи..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Slides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">
            Слайды ({carousel.slides.length})
          </h2>
          <Button variant="outline" size="sm" onClick={handleAddSlide}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Добавить слайд
          </Button>
        </div>

        {carousel.slides.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Нет слайдов. Нажмите «Анализировать» чтобы извлечь слайды из URL,
              или добавьте вручную.
            </p>
          </div>
        )}

        {carousel.slides.map((slide, idx) => {
          const edit = slideEdits[slide.id] ?? {
            text: slide.text ?? "",
            imagePrompt: slide.imagePrompt ?? "",
            slideType: slide.slideType,
            notes: slide.notes ?? "",
          };
          return (
            <div
              key={slide.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4"
            >
              {/* Slide header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-500 w-6 text-center">
                  {idx + 1}
                </span>
                <Select
                  value={edit.slideType}
                  onValueChange={(v) =>
                    setSlideEdits((prev) => ({
                      ...prev,
                      [slide.id]: { ...edit, slideType: v },
                    }))
                  }
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLIDE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge
                  variant="outline"
                  className={`text-xs ${slideTypeColors[edit.slideType] ?? slideTypeColors.body}`}
                >
                  {SLIDE_TYPES.find((t) => t.value === edit.slideType)?.label ?? edit.slideType}
                </Badge>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveSlide(slide.id, "up")}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveSlide(slide.id, "down")}
                    disabled={idx === carousel.slides.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteSlide(slide.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Text */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Текст на слайде</Label>
                  <Textarea
                    placeholder="Текст, который появится на слайде..."
                    value={edit.text}
                    onChange={(e) =>
                      setSlideEdits((prev) => ({
                        ...prev,
                        [slide.id]: { ...edit, text: e.target.value },
                      }))
                    }
                    rows={4}
                    className="text-sm"
                  />
                </div>

                {/* Image prompt + preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Промпт для изображения</Label>
                  <Textarea
                    placeholder="Опишите визуал для генерации фона..."
                    value={edit.imagePrompt}
                    onChange={(e) =>
                      setSlideEdits((prev) => ({
                        ...prev,
                        [slide.id]: { ...edit, imagePrompt: e.target.value },
                      }))
                    }
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleGenerateImage(slide.id)}
                    disabled={generatingSlide === slide.id || !edit.imagePrompt.trim()}
                  >
                    {generatingSlide === slide.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <Image className="h-3.5 w-3.5 mr-2" />
                    )}
                    Сгенерировать фото
                  </Button>
                  {slide.imageUrl && (
                    <div className="mt-2 rounded-md overflow-hidden border border-zinc-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slideImageSrc(slide.imageUrl)}
                        alt={`Slide ${idx + 1}`}
                        className="w-full object-contain max-h-80 bg-zinc-950"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveSlide(slide.id)}
                  disabled={savingField === slide.id}
                >
                  {savingField === slide.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Сохранить слайд
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete */}
      <div className="pt-4 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Удалить карусель
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить карусель?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Все слайды будут удалены. Это действие необратимо.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteCarousel}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
