"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  LayoutGrid,
  List,
  Star,
  StarOff,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { getHooks, createHook, updateHook, deleteHook } from "@/actions/hooks";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatNumber } from "@/lib/utils/formatters";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const HOOK_TYPES = [
  "question",
  "controversy",
  "story",
  "statistic",
  "challenge",
  "pattern_interrupt",
  "curiosity",
  "other",
];
const LANGUAGES = ["ru", "en", "es", "pt", "de", "fr"];

type HookItem = {
  id: string;
  text: string;
  visualDescription: string | null;
  hookType: string | null;
  language: string;
  sourceViews: number | null;
  sourceEr: number | null;
  adaptedText: string | null;
  tags: string[];
  rating: number | null;
  isUsed: boolean;
  notes: string | null;
  video: {
    viewsCount: number | null;
    account: { username: string } | null;
  } | null;
};

export default function HooksPage() {
  const { projectId } = useCurrentProject();
  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAdaptedText, setEditAdaptedText] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterUsed, setFilterUsed] = useState<string>("all");

  const [formText, setFormText] = useState("");
  const [formHookType, setFormHookType] = useState("");
  const [formLang, setFormLang] = useState("ru");

  const fetchHooks = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getHooks(projectId, {
      hookType: filterType !== "all" ? filterType : undefined,
      language: filterLang !== "all" ? filterLang : undefined,
      rating:
        filterRating !== "all" ? parseInt(filterRating) : undefined,
      isUsed:
        filterUsed === "used"
          ? true
          : filterUsed === "unused"
          ? false
          : undefined,
    });
    if (res.success && res.data) {
      setHooks(res.data as unknown as HookItem[]);
    }
    setLoading(false);
  }, [projectId, filterType, filterLang, filterRating, filterUsed]);

  useEffect(() => {
    fetchHooks();
  }, [fetchHooks]);

  const handleCreate = async () => {
    if (!projectId || !formText.trim()) {
      toast.error("Укажите текст хука");
      return;
    }
    setSaving(true);
    const res = await createHook({
      projectId,
      text: formText,
      hookType: formHookType || undefined,
      language: formLang,
    });
    if (res.success) {
      toast.success("Хук добавлен");
      setDialogOpen(false);
      setFormText("");
      setFormHookType("");
      fetchHooks();
    } else {
      toast.error("Ошибка при добавлении хука");
    }
    setSaving(false);
  };

  const handleUpdateAdaptedText = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await updateHook(editingId, { adaptedText: editAdaptedText });
    if (res.success) {
      toast.success("Текст обновлен");
      setEditingId(null);
      fetchHooks();
    } else {
      toast.error("Ошибка при обновлении");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteHook(id);
    if (res.success) {
      toast.success("Хук удален");
      fetchHooks();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const renderStars = (rating: number | null) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className={
              rating && s <= rating
                ? "text-yellow-500"
                : "text-muted-foreground/30"
            }
          >
            <Star className="h-3 w-3 fill-current" />
          </span>
        ))}
      </div>
    );
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра хуков</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Хуки</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить хук
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {HOOK_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Язык" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>
                {l.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Рейтинг" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любой</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterUsed} onValueChange={setFilterUsed}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Использован" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="used">Использован</SelectItem>
            <SelectItem value="unused">Не использован</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : hooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет хуков</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить первый хук
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hooks.map((hook) => (
            <Card key={hook.id} className="relative">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-3">
                    {hook.text}
                  </p>
                  {hook.isUsed && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Check className="mr-1 h-3 w-3" />
                      Исп.
                    </Badge>
                  )}
                </div>
                {hook.hookType && (
                  <Badge variant="outline" className="text-xs">
                    {hook.hookType}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  {renderStars(hook.rating)}
                  <span className="text-xs text-muted-foreground">
                    {hook.language.toUpperCase()}
                  </span>
                  {hook.sourceViews != null && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatNumber(hook.sourceViews)} просм.
                    </span>
                  )}
                </div>
                {hook.adaptedText && (
                  <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2">
                    <span className="font-medium">Адапт.:</span>{" "}
                    {hook.adaptedText}
                  </p>
                )}
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingId(hook.id);
                      setEditAdaptedText(hook.adaptedText || "");
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Адаптировать
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => handleDelete(hook.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Текст</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Язык</TableHead>
                <TableHead>Рейтинг</TableHead>
                <TableHead className="text-right">Просмотры</TableHead>
                <TableHead>Исп.</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hooks.map((hook) => (
                <TableRow key={hook.id}>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm line-clamp-2">{hook.text}</p>
                    {hook.adaptedText && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {hook.adaptedText}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {hook.hookType && (
                      <Badge variant="outline" className="text-xs">
                        {hook.hookType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {hook.language.toUpperCase()}
                  </TableCell>
                  <TableCell>{renderStars(hook.rating)}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatNumber(hook.sourceViews)}
                  </TableCell>
                  <TableCell>
                    {hook.isUsed ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <StarOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(hook.id);
                          setEditAdaptedText(hook.adaptedText || "");
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(hook.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить хук</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="hook-text">Текст хука</Label>
              <Textarea
                id="hook-text"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                rows={3}
                placeholder="Текст хука..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={formHookType} onValueChange={setFormHookType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOOK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Язык</Label>
                <Select value={formLang} onValueChange={setFormLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Адаптировать текст</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Адаптированный текст</Label>
            <Textarea
              value={editAdaptedText}
              onChange={(e) => setEditAdaptedText(e.target.value)}
              rows={4}
              placeholder="Адаптированный вариант хука..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateAdaptedText} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
