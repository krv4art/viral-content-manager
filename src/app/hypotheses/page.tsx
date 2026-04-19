"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  LayoutGrid,
  List,
  GripVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import { getHypotheses, createHypothesis, updateHypothesis, deleteHypothesis } from "@/actions/hypotheses";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const COLUMNS = [
  { id: "idea", label: "Идея", color: "border-t-blue-500" },
  { id: "in_production", label: "В производстве", color: "border-t-yellow-500" },
  { id: "published", label: "Опубликовано", color: "border-t-green-500" },
  { id: "analyzed", label: "Проанализировано", color: "border-t-purple-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

type HypothesisItem = {
  id: string;
  title: string;
  description: string | null;
  format: string | null;
  status: string;
  priority: string;
  expectedResult: string | null;
  actualResult: string | null;
  publicationUrl: string | null;
  metrics: Record<string, unknown> | null;
  learnings: string | null;
  tags: string[];
  createdAt: string;
};

export default function HypothesesPage() {
  const { projectId } = useCurrentProject();
  const [hypotheses, setHypotheses] = useState<HypothesisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFormat, setFormFormat] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formExpectedResult, setFormExpectedResult] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFormat, setEditFormat] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editExpectedResult, setEditExpectedResult] = useState("");
  const [editActualResult, setEditActualResult] = useState("");
  const [editPublicationUrl, setEditPublicationUrl] = useState("");
  const [editLearnings, setEditLearnings] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");
  const [editMetrics, setEditMetrics] = useState<{ views: string; likes: string; comments: string; shares: string; saves: string }>({ views: "", likes: "", comments: "", shares: "", saves: "" });
  const [editSaving, setEditSaving] = useState(false);

  const fetchHypotheses = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getHypotheses(projectId);
    if (res.success && res.data) {
      setHypotheses(res.data as unknown as HypothesisItem[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchHypotheses();
  }, [fetchHypotheses]);

  const handleCreate = async () => {
    if (!projectId || !formTitle.trim()) {
      toast.error("Укажите название гипотезы");
      return;
    }
    setSaving(true);
    const res = await createHypothesis({
      projectId,
      title: formTitle,
      description: formDescription || undefined,
      format: formFormat || undefined,
      priority: formPriority,
      expectedResult: formExpectedResult || undefined,
    });
    if (res.success) {
      toast.success("Гипотеза создана");
      setDialogOpen(false);
      setFormTitle("");
      setFormDescription("");
      setFormFormat("");
      setFormPriority("medium");
      setFormExpectedResult("");
      fetchHypotheses();
    } else {
      toast.error("Ошибка при создании гипотезы");
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateHypothesis(id, { status: newStatus });
    if (res.success) {
      setHypotheses((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h))
      );
      toast.success("Статус обновлен");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteHypothesis(id);
    if (res.success) {
      toast.success("Гипотеза удалена");
      fetchHypotheses();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const openEditDialog = (h: HypothesisItem) => {
    setEditId(h.id);
    setEditTitle(h.title);
    setEditDescription(h.description || "");
    setEditFormat(h.format || "");
    setEditPriority(h.priority);
    setEditExpectedResult(h.expectedResult || "");
    setEditActualResult(h.actualResult || "");
    setEditPublicationUrl(h.publicationUrl || "");
    setEditLearnings(h.learnings || "");
    setEditTagsInput(h.tags.join(", "));
    const m = (h.metrics || {}) as Record<string, unknown>;
    setEditMetrics({
      views: String(m.views ?? ""),
      likes: String(m.likes ?? ""),
      comments: String(m.comments ?? ""),
      shares: String(m.shares ?? ""),
      saves: String(m.saves ?? ""),
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("Укажите название гипотезы");
      return;
    }
    setEditSaving(true);
    const metricsObj: Record<string, number> = {};
    if (editMetrics.views) metricsObj.views = Number(editMetrics.views);
    if (editMetrics.likes) metricsObj.likes = Number(editMetrics.likes);
    if (editMetrics.comments) metricsObj.comments = Number(editMetrics.comments);
    if (editMetrics.shares) metricsObj.shares = Number(editMetrics.shares);
    if (editMetrics.saves) metricsObj.saves = Number(editMetrics.saves);

    const res = await updateHypothesis(editId, {
      title: editTitle,
      description: editDescription || undefined,
      format: editFormat || undefined,
      priority: editPriority,
      expectedResult: editExpectedResult || undefined,
      actualResult: editActualResult || undefined,
      publicationUrl: editPublicationUrl || undefined,
      metrics: Object.keys(metricsObj).length > 0 ? metricsObj : undefined,
      learnings: editLearnings || undefined,
      tags: editTagsInput.split(",").map((t) => t.trim()).filter(Boolean) || undefined,
    });
    if (res.success) {
      toast.success("Гипотеза обновлена");
      setEditDialogOpen(false);
      fetchHypotheses();
    } else {
      toast.error("Ошибка при обновлении");
    }
    setEditSaving(false);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedId) {
      handleStatusChange(draggedId, newStatus);
      setDraggedId(null);
    }
  };

  const getHypothesesByStatus = (status: string) =>
    hypotheses.filter((h) => h.status === status);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра гипотез</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Гипотезы</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая гипотеза
        </Button>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1">
            <LayoutGrid className="h-3.5 w-3.5" />
            Канбан
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1">
            <List className="h-3.5 w-3.5" />
            Таблица
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map((col) => {
                const items = getHypothesesByStatus(col.id);
                return (
                  <div
                    key={col.id}
                    className={`rounded-xl border-t-4 ${col.color} bg-muted/30 p-3 space-y-3 min-h-[300px]`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Перетащите карточку сюда
                      </p>
                    ) : (
                      items.map((h) => (
                        <Card
                          key={h.id}
                          draggable
                          onDragStart={() => handleDragStart(h.id)}
                          className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                            draggedId === h.id ? "opacity-50" : ""
                          }`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">
                                  {h.title}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => openEditDialog(h)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-destructive"
                                onClick={() => handleDelete(h.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {h.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                                {h.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 pl-6">
                              <span
                                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                                  PRIORITY_COLORS[h.priority]
                                }`}
                              >
                                {PRIORITY_LABELS[h.priority]}
                              </span>
                              {h.format && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {h.format}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : hypotheses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">Нет гипотез</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первую гипотезу
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Формат</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hypotheses.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{h.title}</p>
                          {h.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {h.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={h.status}
                          onValueChange={(v) => handleStatusChange(h.id, v)}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((col) => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_COLORS[h.priority]
                          }`}
                        >
                          {PRIORITY_LABELS[h.priority]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {h.format ? (
                          <Badge variant="outline" className="text-xs">
                            {h.format}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(h.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(h)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(h.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая гипотеза</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="hyp-title">Название</Label>
              <Input
                id="hyp-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Название гипотезы"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hyp-desc">Описание</Label>
              <Textarea
                id="hyp-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Описание гипотезы..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Формат</Label>
                <Input
                  value={formFormat}
                  onChange={(e) => setFormFormat(e.target.value)}
                  placeholder="Формат контента"
                />
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hyp-expected">Ожидаемый результат</Label>
              <Textarea
                id="hyp-expected"
                value={formExpectedResult}
                onChange={(e) => setFormExpectedResult(e.target.value)}
                rows={2}
                placeholder="Что ожидаем получить..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать гипотезу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Название гипотезы" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} placeholder="Описание гипотезы..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Формат</Label>
                <Input value={editFormat} onChange={(e) => setEditFormat(e.target.value)} placeholder="Формат контента" />
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ожидаемый результат</Label>
              <Textarea value={editExpectedResult} onChange={(e) => setEditExpectedResult(e.target.value)} rows={2} placeholder="Что ожидаем получить..." />
            </div>
            <div className="space-y-2">
              <Label>Фактический результат</Label>
              <Textarea value={editActualResult} onChange={(e) => setEditActualResult(e.target.value)} rows={2} placeholder="Что получилось..." />
            </div>
            <div className="space-y-2">
              <Label>Ссылка на публикацию</Label>
              <Input value={editPublicationUrl} onChange={(e) => setEditPublicationUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Метрики</Label>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Просмотры</Label>
                  <Input type="number" value={editMetrics.views} onChange={(e) => setEditMetrics((m) => ({ ...m, views: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Лайки</Label>
                  <Input type="number" value={editMetrics.likes} onChange={(e) => setEditMetrics((m) => ({ ...m, likes: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Комменты</Label>
                  <Input type="number" value={editMetrics.comments} onChange={(e) => setEditMetrics((m) => ({ ...m, comments: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Шеры</Label>
                  <Input type="number" value={editMetrics.shares} onChange={(e) => setEditMetrics((m) => ({ ...m, shares: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Сохранения</Label>
                  <Input type="number" value={editMetrics.saves} onChange={(e) => setEditMetrics((m) => ({ ...m, saves: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Выводы</Label>
              <Textarea value={editLearnings} onChange={(e) => setEditLearnings(e.target.value)} rows={2} placeholder="Что узнали..." />
            </div>
            <div className="space-y-2">
              <Label>Теги (через запятую)</Label>
              <Input value={editTagsInput} onChange={(e) => setEditTagsInput(e.target.value)} placeholder="виральный, тест, тренд" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
