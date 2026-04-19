"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Flame, Sun, Snowflake } from "lucide-react";
import { getTrends, createTrend, deleteTrend } from "@/actions/trends";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatDate } from "@/lib/utils/formatters";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TREND_TYPES = ["audio", "format", "topic", "challenge", "effect", "meme"];
const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter", "all"];

const relevanceConfig: Record<
  string,
  { color: string; icon: typeof Flame; label: string }
> = {
  hot: {
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: Flame,
    label: "Горячий",
  },
  warm: {
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    icon: Sun,
    label: "Теплый",
  },
  cold: {
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Snowflake,
    label: "Холодный",
  },
};

type TrendItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  platform: string | null;
  relevance: string;
  tags: string[];
  createdAt: string;
};

export default function TrendsPage() {
  const { projectId } = useCurrentProject();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterRelevance, setFilterRelevance] = useState<string>("all");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("format");
  const [formPlatform, setFormPlatform] = useState("");
  const [formRelevance, setFormRelevance] = useState("warm");

  const fetchTrends = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getTrends(projectId, {
      type: filterType !== "all" ? filterType : undefined,
      platform: filterPlatform !== "all" ? filterPlatform : undefined,
      relevance: filterRelevance !== "all" ? filterRelevance : undefined,
    });
    if (res.success && res.data) {
      setTrends(res.data as unknown as TrendItem[]);
    }
    setLoading(false);
  }, [projectId, filterType, filterPlatform, filterRelevance]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleCreate = async () => {
    if (!projectId || !formTitle.trim()) {
      toast.error("Укажите название тренда");
      return;
    }
    setSaving(true);
    const res = await createTrend({
      projectId,
      title: formTitle,
      description: formDescription || undefined,
      type: formType,
      platform: formPlatform || undefined,
      relevance: formRelevance,
    });
    if (res.success) {
      toast.success("Тренд добавлен");
      setDialogOpen(false);
      setFormTitle("");
      setFormDescription("");
      fetchTrends();
    } else {
      toast.error("Ошибка при добавлении тренда");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteTrend(id);
    if (res.success) {
      toast.success("Тренд удален");
      fetchTrends();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра трендов</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Тренды</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить тренд
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {TREND_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Платформа" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все платформы</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRelevance} onValueChange={setFilterRelevance}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Актуальность" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="hot">Горячие</SelectItem>
            <SelectItem value="warm">Теплые</SelectItem>
            <SelectItem value="cold">Холодные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет трендов</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить первый тренд
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trends.map((trend) => {
            const relConfig = relevanceConfig[trend.relevance] || relevanceConfig.warm;
            const RelIcon = relConfig.icon;
            return (
              <Card key={trend.id} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">
                      {trend.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(trend.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {trend.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {trend.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {trend.type}
                    </Badge>
                    {trend.platform && (
                      <Badge variant="secondary" className="text-xs">
                        {trend.platform}
                      </Badge>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${relConfig.color}`}
                    >
                      <RelIcon className="h-3 w-3" />
                      {relConfig.label}
                    </span>
                  </div>
                  {trend.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trend.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(trend.createdAt)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить тренд</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="trend-title">Название</Label>
              <Input
                id="trend-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Название тренда"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trend-desc">Описание</Label>
              <Textarea
                id="trend-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Описание тренда..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Платформа</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Актуальность</Label>
                <Select value={formRelevance} onValueChange={setFormRelevance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Горячий</SelectItem>
                    <SelectItem value="warm">Теплый</SelectItem>
                    <SelectItem value="cold">Холодный</SelectItem>
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
    </div>
  );
}
