"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  Download,
  Check,
  X,
} from "lucide-react";
import {
  getKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  getClusterStats,
  seedKeywords,
} from "@/actions/keywords";
import { useCurrentProject } from "@/components/layout/project-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";

type KeywordItem = {
  id: string;
  phrase: string;
  cluster: string | null;
  type: string;
  platform: string;
  volume: string;
  intent: string | null;
  priority: string;
  isCovered: boolean;
  notes: string | null;
  tags: string[];
};

const CLUSTERS = [
  "Direct Search",
  "Pain Points",
  "Morning Routine",
  "Biohacking",
  "Brain Rot",
  "Cognitive Aging",
  "Challenge Format",
  "Productivity",
  "Competitor Displacement",
  "TikTok Hooks",
  "Identity",
  "Hashtag Niche",
  "Hashtag Broad",
];

const volumeBadge: Record<string, string> = {
  high: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-red-500/10 text-red-500 border-red-500/20",
  unknown: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const volumeLabel: Record<string, string> = {
  high: "H",
  medium: "M",
  low: "L",
  unknown: "?",
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const intentBadge: Record<string, string> = {
  awareness: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  consideration: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  conversion: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function KeywordsPage() {
  const { projectId } = useCurrentProject();
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [clusterStats, setClusterStats] = useState<
    { cluster: string; total: number; covered: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [filterCluster, setFilterCluster] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCovered, setFilterCovered] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterIntent, setFilterIntent] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editKeyword, setEditKeyword] = useState<KeywordItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const [formPhrase, setFormPhrase] = useState("");
  const [formCluster, setFormCluster] = useState("");
  const [formType, setFormType] = useState("search");
  const [formPlatform, setFormPlatform] = useState("tiktok");
  const [formVolume, setFormVolume] = useState("unknown");
  const [formIntent, setFormIntent] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [kwRes, statsRes] = await Promise.all([
      getKeywords(projectId, {
        cluster: filterCluster,
        type: filterType,
        isCovered:
          filterCovered === "all"
            ? undefined
            : filterCovered === "covered",
        priority: filterPriority,
        intent: filterIntent,
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
      getClusterStats(projectId),
    ]);
    if (kwRes.success && "data" in kwRes) {
      setKeywords(kwRes.data as unknown as KeywordItem[]);
      setTotal(kwRes.total);
    }
    if (statsRes.success && "data" in statsRes) {
      setClusterStats(statsRes.data);
    }
    setLoading(false);
  }, [
    projectId,
    filterCluster,
    filterType,
    filterCovered,
    filterPriority,
    filterIntent,
    page,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetFilters = () => {
    setFilterCluster("all");
    setFilterType("all");
    setFilterCovered("all");
    setFilterPriority("all");
    setFilterIntent("all");
    setPage(0);
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await seedKeywords(projectId!);
    if (res.success) {
      toast.success(`Импортировано ${res.count} ключевых фраз`);
      setImportOpen(false);
      fetchData();
    } else {
      toast.error("error" in res ? res.error : "Ошибка импорта");
    }
    setImporting(false);
  };

  const handleToggleCovered = async (id: string, current: boolean) => {
    await updateKeyword(id, { isCovered: !current });
    fetchData();
  };

  const handleCreate = async () => {
    if (!formPhrase.trim()) {
      toast.error("Укажите фразу");
      return;
    }
    setSaving(true);
    const res = await createKeyword({
      projectId: projectId!,
      phrase: formPhrase,
      cluster: formCluster || undefined,
      type: formType,
      platform: formPlatform,
      volume: formVolume,
      intent: formIntent || undefined,
      priority: formPriority,
      notes: formNotes || undefined,
    });
    if (res.success) {
      toast.success("Ключевая фраза добавлена");
      setCreateOpen(false);
      resetForm();
      fetchData();
    } else {
      toast.error("Ошибка при добавлении");
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editKeyword) return;
    setSaving(true);
    const res = await updateKeyword(editKeyword.id, {
      phrase: editKeyword.phrase,
      cluster: editKeyword.cluster ?? undefined,
      type: editKeyword.type,
      platform: editKeyword.platform,
      volume: editKeyword.volume,
      intent: editKeyword.intent ?? undefined,
      priority: editKeyword.priority,
      notes: editKeyword.notes ?? undefined,
    });
    if (res.success) {
      toast.success("Ключевая фраза обновлена");
      setEditKeyword(null);
      fetchData();
    } else {
      toast.error("Ошибка при обновлении");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteKeyword(id);
    if (res.success) {
      toast.success("Ключевая фраза удалена");
      fetchData();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const resetForm = () => {
    setFormPhrase("");
    setFormCluster("");
    setFormType("search");
    setFormPlatform("tiktok");
    setFormVolume("unknown");
    setFormIntent("");
    setFormPriority("medium");
    setFormNotes("");
  };

  const totalKw = clusterStats.reduce((s, c) => s + c.total, 0);
  const coveredKw = clusterStats.reduce((s, c) => s + c.covered, 0);
  const coveragePercent =
    totalKw > 0 ? Math.round((coveredKw / totalKw) * 100) : 0;

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">
          Выберите проект для просмотра ключевых слов
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ключевые слова</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Импорт базы
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      {clusterStats.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6 mb-4">
              <div>
                <span className="text-2xl font-bold">{totalKw}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  фраз
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-green-500">
                  {coveredKw}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  покрыто
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold">{coveragePercent}%</span>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {clusterStats.slice(0, 7).map((cs) => (
                <div
                  key={cs.cluster}
                  className="rounded-lg border border-zinc-800 p-2 text-center"
                >
                  <p className="text-xs text-muted-foreground truncate">
                    {cs.cluster}
                  </p>
                  <p className="text-sm font-medium">
                    {cs.covered}/{cs.total}
                  </p>
                  <div className="h-1.5 rounded-full bg-zinc-800 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${cs.total > 0 ? (cs.covered / cs.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterCluster} onValueChange={(v) => { setFilterCluster(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Кластер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все кластеры</SelectItem>
            {CLUSTERS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="search">Search</SelectItem>
            <SelectItem value="hashtag">Hashtag</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCovered} onValueChange={(v) => { setFilterCovered(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Покрытие" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="covered">Покрыто</SelectItem>
            <SelectItem value="uncovered">Не покрыто</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Приоритет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterIntent} onValueChange={(v) => { setFilterIntent(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="awareness">Awareness</SelectItem>
            <SelectItem value="consideration">Consideration</SelectItem>
            <SelectItem value="conversion">Conversion</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Сбросить
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет ключевых фраз</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Импорт базы Brainura
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить вручную
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фраза</TableHead>
                <TableHead>Кластер</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Vol</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Приор.</TableHead>
                <TableHead className="text-center">Покрыто</TableHead>
                <TableHead>TikTok</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((kw) => (
                <TableRow key={kw.id}>
                  <TableCell
                    className="cursor-pointer hover:underline max-w-[300px] truncate"
                    onClick={() => setEditKeyword({ ...kw })}
                  >
                    {kw.phrase}
                  </TableCell>
                  <TableCell>
                    {kw.cluster && (
                      <Badge variant="outline" className="text-xs">
                        {kw.cluster}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        kw.type === "search"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}
                    >
                      {kw.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${volumeBadge[kw.volume] ?? volumeBadge.unknown}`}
                    >
                      {volumeLabel[kw.volume] ?? "?"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {kw.intent && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${intentBadge[kw.intent] ?? ""}`}
                      >
                        {kw.intent}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${priorityBadge[kw.priority] ?? ""}`}
                    >
                      {kw.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${kw.isCovered ? "text-green-500" : "text-zinc-600"}`}
                      onClick={() => handleToggleCovered(kw.id, kw.isCovered)}
                    >
                      {kw.isCovered ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://www.tiktok.com/search?q=${encodeURIComponent(kw.phrase)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(kw.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из{" "}
            {total}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить ключевую фразу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Фраза</Label>
              <Input
                value={formPhrase}
                onChange={(e) => setFormPhrase(e.target.value)}
                placeholder="brain training app"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Кластер</Label>
                <Select value={formCluster} onValueChange={setFormCluster}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLUSTERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="search">Search</SelectItem>
                    <SelectItem value="hashtag">Hashtag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Платформа</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Volume</Label>
                <Select value={formVolume} onValueChange={setFormVolume}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Intent</Label>
                <Select value={formIntent} onValueChange={setFormIntent}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Awareness</SelectItem>
                    <SelectItem value="consideration">Consideration</SelectItem>
                    <SelectItem value="conversion">Conversion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={formPriority} onValueChange={setFormPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Заметки..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editKeyword !== null}
        onOpenChange={(open) => {
          if (!open) setEditKeyword(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать ключевую фразу</DialogTitle>
          </DialogHeader>
          {editKeyword && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Фраза</Label>
                <Input
                  value={editKeyword.phrase}
                  onChange={(e) =>
                    setEditKeyword({ ...editKeyword, phrase: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Кластер</Label>
                  <Select
                    value={editKeyword.cluster ?? ""}
                    onValueChange={(v) =>
                      setEditKeyword({ ...editKeyword, cluster: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLUSTERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select
                    value={editKeyword.type}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        type: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search">Search</SelectItem>
                      <SelectItem value="hashtag">Hashtag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Платформа</Label>
                  <Select
                    value={editKeyword.platform}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        platform: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Volume</Label>
                  <Select
                    value={editKeyword.volume}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        volume: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intent</Label>
                  <Select
                    value={editKeyword.intent ?? ""}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        intent: v || null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Awareness</SelectItem>
                      <SelectItem value="consideration">Consideration</SelectItem>
                      <SelectItem value="conversion">Conversion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select
                    value={editKeyword.priority}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        priority: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Покрыто</Label>
                  <Select
                    value={editKeyword.isCovered ? "yes" : "no"}
                    onValueChange={(v) =>
                      setEditKeyword({
                        ...editKeyword,
                        isCovered: v === "yes",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Да</SelectItem>
                      <SelectItem value="no">Нет</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Заметки</Label>
                <Textarea
                  value={editKeyword.notes ?? ""}
                  onChange={(e) =>
                    setEditKeyword({
                      ...editKeyword,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKeyword(null)}>
              Отмена
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Импорт базы Brainura</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Будет добавлено ~300 ключевых фраз в 13 кластерах для текущего
            проекта. Повторный запуск безопасен — дубли пропускаются.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Импорт..." : "Импортировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
