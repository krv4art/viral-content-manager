"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Star,
  Check,
} from "lucide-react";
import { ColumnToggle } from "@/components/ui/column-toggle";
import { getScripts, createScript, updateScript, deleteScript } from "@/actions/scripts";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatNumber, formatDuration } from "@/lib/utils/formatters";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Multiselect } from "@/components/ui/multiselect";
import { toast } from "sonner";

const FORMATS = [
  "short_video",
  "long_video",
  "reel",
  "story",
  "carousel",
  "live",
];
const LANGUAGES = ["ru", "en", "es", "pt", "de", "fr"];

type ScriptItem = {
  id: string;
  title: string;
  hook: string | null;
  body: string | null;
  cta: string | null;
  fullText: string | null;
  format: string | null;
  durationSeconds: number | null;
  language: string;
  sourceViews: number | null;
  adaptedVersion: string | null;
  tags: string[];
  rating: number | null;
  isUsed: boolean;
  notes: string | null;
};

export default function ScriptsPage() {
  const { projectId } = useCurrentProject();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterFormat, setFilterFormat] = useState<string[]>([]);
  const [filterLang, setFilterLang] = useState<string[]>([]);
  const [filterRating, setFilterRating] = useState<number[]>([]);

  const SCRIPT_COLUMNS = [
    { key: "format", label: "Формат" },
    { key: "language", label: "Язык" },
    { key: "rating", label: "Рейтинг" },
    { key: "duration", label: "Длительность" },
    { key: "isUsed", label: "Исп." },
  ];
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(SCRIPT_COLUMNS.map((c) => c.key))
  );
  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const [formTitle, setFormTitle] = useState("");
  const [formHook, setFormHook] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCta, setFormCta] = useState("");
  const [formFormat, setFormFormat] = useState("");
  const [formLang, setFormLang] = useState("ru");

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFullText, setEditFullText] = useState("");
  const [editFormat, setEditFormat] = useState("");
  const [editRating, setEditRating] = useState("");

  const fetchScripts = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getScripts(projectId, {
      format: filterFormat.length > 0 ? filterFormat : undefined,
      language: filterLang.length > 0 ? filterLang : undefined,
      rating: filterRating.length > 0 ? filterRating : undefined,
    });
    if (res.success && res.data) {
      setScripts(res.data as unknown as ScriptItem[]);
    }
    setLoading(false);
  }, [projectId, filterFormat, filterLang, filterRating]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleCreate = async () => {
    if (!projectId || !formTitle.trim()) {
      toast.error("Укажите название сценария");
      return;
    }
    setSaving(true);
    const res = await createScript({
      projectId,
      title: formTitle,
      hook: formHook || undefined,
      body: formBody || undefined,
      cta: formCta || undefined,
      fullText: [formHook, formBody, formCta].filter(Boolean).join("\n\n") || undefined,
      format: formFormat || undefined,
      language: formLang,
    });
    if (res.success) {
      toast.success("Сценарий добавлен");
      setDialogOpen(false);
      setFormTitle("");
      setFormHook("");
      setFormBody("");
      setFormCta("");
      fetchScripts();
    } else {
      toast.error("Ошибка при добавлении");
    }
    setSaving(false);
  };

  const openEdit = (script: ScriptItem) => {
    setEditId(script.id);
    setEditTitle(script.title);
    setEditFullText(script.fullText || "");
    setEditFormat(script.format || "");
    setEditRating(script.rating?.toString() || "");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    setSaving(true);
    const res = await updateScript(editId, {
      title: editTitle,
      fullText: editFullText || undefined,
      format: editFormat || undefined,
      rating: editRating ? parseInt(editRating) : undefined,
    });
    if (res.success) {
      toast.success("Сценарий обновлен");
      setEditDialogOpen(false);
      fetchScripts();
    } else {
      toast.error("Ошибка при обновлении");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteScript(id);
    if (res.success) {
      toast.success("Сценарий удален");
      fetchScripts();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const renderStars = (rating: number | null) => (
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

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра сценариев</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сценарии</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить сценарий
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Multiselect
          label="Формат"
          options={FORMATS.map((f) => ({ value: f, label: f }))}
          selected={filterFormat}
          onChange={setFilterFormat}
          width="w-[160px]"
        />
        <Multiselect
          label="Язык"
          options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
          selected={filterLang}
          onChange={setFilterLang}
          width="w-[120px]"
        />
        <Multiselect
          label="Рейтинг"
          options={[1, 2, 3, 4, 5].map((r) => ({ value: String(r), label: `${r}+` }))}
          selected={filterRating.map(String)}
          onChange={(v) => setFilterRating(v.map(Number))}
          width="w-[130px]"
        />
        <ColumnToggle columns={SCRIPT_COLUMNS} visibleColumns={visibleColumns} onToggle={toggleColumn} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет сценариев</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить первый сценарий
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Название</TableHead>
                {visibleColumns.has("format") && <TableHead>Формат</TableHead>}
                {visibleColumns.has("language") && <TableHead>Язык</TableHead>}
                {visibleColumns.has("rating") && <TableHead>Рейтинг</TableHead>}
                {visibleColumns.has("duration") && <TableHead>Длительность</TableHead>}
                {visibleColumns.has("isUsed") && <TableHead>Исп.</TableHead>}
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.map((script) => (
                <>
                  <TableRow key={script.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setExpandedId(
                            expandedId === script.id ? null : script.id
                          )
                        }
                      >
                        {expandedId === script.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {script.title}
                    </TableCell>
                    {visibleColumns.has("format") && (
                      <TableCell>
                        {script.format ? (
                          <Badge variant="outline" className="text-xs">
                            {script.format}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.has("language") && (
                      <TableCell className="text-sm">
                        {script.language.toUpperCase()}
                      </TableCell>
                    )}
                    {visibleColumns.has("rating") && (
                      <TableCell>{renderStars(script.rating)}</TableCell>
                    )}
                    {visibleColumns.has("duration") && (
                      <TableCell className="text-sm">
                        {formatDuration(script.durationSeconds)}
                      </TableCell>
                    )}
                    {visibleColumns.has("isUsed") && (
                      <TableCell>
                        {script.isUsed ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(script)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(script.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === script.id && (
                    <TableRow key={`${script.id}-expanded`}>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="p-4 max-w-2xl">
                          {script.fullText ? (
                            <p className="text-sm whitespace-pre-wrap">
                              {script.fullText}
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {script.hook && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    ХУК
                                  </p>
                                  <p className="text-sm">{script.hook}</p>
                                </div>
                              )}
                              {script.body && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    ОСНОВНАЯ ЧАСТЬ
                                  </p>
                                  <p className="text-sm">{script.body}</p>
                                </div>
                              )}
                              {script.cta && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    CTA
                                  </p>
                                  <p className="text-sm">{script.cta}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {script.adaptedVersion && (
                            <div className="mt-3 border-t pt-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                АДАПТИРОВАННАЯ ВЕРСИЯ
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {script.adaptedVersion}
                              </p>
                            </div>
                          )}
                          {script.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {script.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить сценарий</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="script-title">Название</Label>
              <Input
                id="script-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Название сценария"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-hook">Хук</Label>
              <Textarea
                id="script-hook"
                value={formHook}
                onChange={(e) => setFormHook(e.target.value)}
                rows={2}
                placeholder="Хук сценария..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-body">Основная часть</Label>
              <Textarea
                id="script-body"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                placeholder="Основной текст..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="script-cta">CTA</Label>
              <Input
                id="script-cta"
                value={formCta}
                onChange={(e) => setFormCta(e.target.value)}
                placeholder="Призыв к действию..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Формат</Label>
                <Select value={formFormat} onValueChange={setFormFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Формат" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать сценарий</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Полный текст</Label>
              <Textarea
                value={editFullText}
                onChange={(e) => setEditFullText(e.target.value)}
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Формат</Label>
                <Select value={editFormat} onValueChange={setEditFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Рейтинг</Label>
                <Select value={editRating} onValueChange={setEditRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Без рейтинга</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
