"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw, RefreshCwOff, ExternalLink, Square, Trash2, Settings2, Pencil, Check, X, Tag } from "lucide-react";
import { ColumnToggle } from "@/components/ui/column-toggle";
import { getAccounts, createAccount, triggerScrapeAccount, updateScrapeStatus, deleteAccount, updateAccount } from "@/actions/accounts";
import { useCurrentProject } from "@/components/layout/project-provider";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils/formatters";
import { TagInput } from "@/components/ui/tag-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Multiselect } from "@/components/ui/multiselect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter"];
const CATEGORIES = ["competitor", "inspiration", "own", "trending"];

const COLOR_PALETTE = [
  { id: "red", bg: "bg-red-500", ring: "ring-red-300" },
  { id: "orange", bg: "bg-orange-500", ring: "ring-orange-300" },
  { id: "amber", bg: "bg-amber-500", ring: "ring-amber-300" },
  { id: "green", bg: "bg-green-500", ring: "ring-green-300" },
  { id: "blue", bg: "bg-blue-500", ring: "ring-blue-300" },
  { id: "purple", bg: "bg-purple-500", ring: "ring-purple-300" },
  { id: "pink", bg: "bg-pink-500", ring: "ring-pink-300" },
  { id: "slate", bg: "bg-slate-500", ring: "ring-slate-300" },
] as const;

type ColorLabel = { color: string; text: string };

function ColorLabelPopover({ account, onUpdate }: { account: Account; onUpdate: () => void }) {
  const labels: ColorLabel[] = (account.colorLabels ?? []) as ColorLabel[];
  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState<string>(COLOR_PALETTE[0].id);

  const save = async (newLabels: ColorLabel[]) => {
    await updateAccount(account.id, { colorLabels: newLabels });
    onUpdate();
  };

  const addLabel = () => {
    setEditIdx(labels.length);
    setEditText("");
    setEditColor(COLOR_PALETTE[0].id);
  };

  const confirmEdit = () => {
    if (!editText.trim()) return;
    const updated = [...labels];
    if (editIdx !== null && editIdx < updated.length) {
      updated[editIdx] = { color: editColor, text: editText.trim() };
    } else {
      updated.push({ color: editColor, text: editText.trim() });
    }
    save(updated);
    setEditIdx(null);
  };

  const removeLabel = (idx: number) => {
    const updated = labels.filter((_, i) => i !== idx);
    save(updated);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditIdx(null); }}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted">
          <Tag className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1" align="start">
        {labels.map((cl, i) => {
          const pal = COLOR_PALETTE.find((p) => p.id === cl.color);
          if (editIdx === i) {
            return (
              <div key={i} className="flex items-center gap-1.5 p-1">
                <div className="flex gap-0.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.id}
                      className={`h-4 w-4 rounded-full ${c.bg} ring-1 ${editColor === c.id ? "ring-2 ring-offset-1 ring-foreground" : "ring-transparent"}`}
                      onClick={() => setEditColor(c.id)}
                    />
                  ))}
                </div>
                <Input
                  className="h-7 text-xs flex-1"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditIdx(null); }}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={confirmEdit}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 group">
              <span className={`h-3 w-3 rounded-full shrink-0 ${pal?.bg ?? "bg-gray-400"}`} />
              <span className="text-xs flex-1 truncate">{cl.text}</span>
              <button
                className="h-5 w-5 rounded opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center hover:bg-muted"
                onClick={() => { setEditIdx(i); setEditText(cl.text); setEditColor(cl.color); }}
              >
                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <button
                className="h-5 w-5 rounded opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center hover:bg-muted"
                onClick={() => removeLabel(i)}
              >
                <X className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>
          );
        })}
        {editIdx !== null && editIdx >= labels.length && (
          <div className="flex items-center gap-1.5 p-1">
            <div className="flex gap-0.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  className={`h-4 w-4 rounded-full ${c.bg} ring-1 ${editColor === c.id ? "ring-2 ring-offset-1 ring-foreground" : "ring-transparent"}`}
                  onClick={() => setEditColor(c.id)}
                />
              ))}
            </div>
            <Input
              className="h-7 text-xs flex-1"
              placeholder="Пояснение..."
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditIdx(null); }}
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={confirmEdit}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        )}
        {editIdx === null && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={addLabel}>
            <Plus className="h-3 w-3 mr-1" /> Добавить метку
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type Account = {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayName: string | null;
  followersCount: number | null;
  avgViews: number | null;
  avgEngagementRate: number | null;
  category: string;
  tags: string[];
  autoScrape: boolean;
  medianViews: number | null;
  lastScrapedAt: Date | null;
  scrapeStatus: string;
  colorLabels: ColorLabel[] | null;
  _count: { videos: number };
};

export default function AccountsPage() {
  const { projectId } = useCurrentProject();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string[]>([]);
  const [showStatFilters, setShowStatFilters] = useState(false);
  const [filterMinAvgViews, setFilterMinAvgViews] = useState<number | "">("");
  const [filterMinMedianViews, setFilterMinMedianViews] = useState<number | "">("");
  const [filterMaxFollowers, setFilterMaxFollowers] = useState<number | "">("");

  const [formPlatform, setFormPlatform] = useState("tiktok");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("competitor");
  const [formTags, setFormTags] = useState<string[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteVideos, setDeleteVideos] = useState(false);

  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryAccountId, setNewCategoryAccountId] = useState("");
  const [newCategoryValue, setNewCategoryValue] = useState("");

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [reassignFrom, setReassignFrom] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [removedCategories, setRemovedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [newCatInput, setNewCatInput] = useState("");

  const ACCOUNT_COLUMNS = [
    { key: "platform", label: "Платформа" },
    { key: "followers", label: "Подписчики" },
    { key: "avgViews", label: "Ср. просмотры" },
    { key: "median", label: "Медиана" },
    { key: "er", label: "Ср. ER" },
    { key: "category", label: "Категория" },
    { key: "lastScraped", label: "Последний сбор" },
  ];
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(ACCOUNT_COLUMNS.map((c) => c.key))
  );
  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const fetchAccounts = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getAccounts(projectId, {
      platform: filterPlatform.length > 0 ? filterPlatform : undefined,
      category: filterCategory.length > 0 ? filterCategory : undefined,
      tag: filterTag.length > 0 ? filterTag : undefined,
      minAvgViews: filterMinAvgViews || undefined,
      maxFollowers: filterMaxFollowers || undefined,
      minMedianViews: filterMinMedianViews || undefined,
    });
    if (res.success && res.data) {
      setAccounts(res.data as unknown as Account[]);
    }
    setLoading(false);
  }, [projectId, filterPlatform, filterCategory, filterTag, filterMinAvgViews, filterMaxFollowers, filterMinMedianViews]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const hasInProgress = accounts.some((a) => a.scrapeStatus === "in_progress");
    if (!hasInProgress) return;
    const interval = setInterval(() => {
      fetchAccounts();
    }, 5000);
    return () => clearInterval(interval);
  }, [accounts, fetchAccounts]);

  const uniqueTags = Array.from(new Set(accounts.flatMap((a) => a.tags)));
  const uniqueCategories = Array.from(new Set([
    ...CATEGORIES,
    ...extraCategories,
    ...accounts.map((a) => a.category),
  ])).filter((c) => !(removedCategories.has(c) && !accounts.some((a) => a.category === c)));

  const filteredAccounts = accounts;

  const handleCreate = async () => {
    if (!projectId || !formUrl.trim()) {
      toast.error("Укажите URL или username аккаунта");
      return;
    }
    setSaving(true);
    const username = formUrl
      .replace(/https?:\/\/(www\.)?/, "")
      .replace(/\/$/, "")
      .split("/")
      .pop() || formUrl;

    const res = await createAccount({
      projectId,
      platform: formPlatform,
      username,
      url: formUrl.startsWith("http") ? formUrl : `https://${formPlatform}.com/@${formUrl}`,
      category: formCategory,
      tags: formTags,
    });

    if (res.success) {
      toast.success("Аккаунт добавлен");
      setDialogOpen(false);
      setFormUrl("");
      setFormTags([]);
      fetchAccounts();
    } else {
      toast.error("Ошибка при добавлении аккаунта");
    }
    setSaving(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === filteredAccounts.length ? new Set() : new Set(filteredAccounts.map((a) => a.id))
    );
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map((id) => deleteAccount(id, deleteVideos)));
    toast.success(`Удалено ${ids.length} аккаунт(ов)`);
    setSelected(new Set());
    setDeleteDialogOpen(false);
    setDeleteVideos(false);
    setDeleting(false);
    fetchAccounts();
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра аккаунтов</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аккаунты</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить ({selected.size})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить аккаунт
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center w-full">
        <Multiselect
          label="Платформа"
          options={PLATFORMS.map((p) => ({ value: p, label: p }))}
          selected={filterPlatform}
          onChange={setFilterPlatform}
          width="w-[160px]"
        />
        <Multiselect
          label="Категория"
          options={uniqueCategories.map((c) => ({ value: c, label: c }))}
          selected={filterCategory}
          onChange={setFilterCategory}
          width="w-[160px]"
        />
        <Multiselect
          label="Тег"
          options={uniqueTags.map((t) => ({ value: t, label: t }))}
          selected={filterTag}
          onChange={setFilterTag}
          width="w-[160px]"
        />
        <Button variant="outline" size="sm" onClick={() => setShowStatFilters(!showStatFilters)}>
          Фильтры {(filterMinAvgViews || filterMinMedianViews || filterMaxFollowers) ? "•" : ""}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setReassignFrom(null); setManageCategoriesOpen(true); }}>
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Категории
        </Button>
        <ColumnToggle columns={ACCOUNT_COLUMNS} visibleColumns={visibleColumns} onToggle={toggleColumn} />
      </div>

      {showStatFilters && (
        <div className="flex gap-3 items-center flex-wrap">
          <Input
            type="number"
            placeholder="Мин. ср. просмотры"
            className="w-[180px]"
            value={filterMinAvgViews}
            onChange={(e) => setFilterMinAvgViews(e.target.value ? Number(e.target.value) : "")}
          />
          <Input
            type="number"
            placeholder="Мин. медиана"
            className="w-[160px]"
            value={filterMinMedianViews}
            onChange={(e) => setFilterMinMedianViews(e.target.value ? Number(e.target.value) : "")}
          />
          <Input
            type="number"
            placeholder="Макс. подписчики"
            className="w-[180px]"
            value={filterMaxFollowers}
            onChange={(e) => setFilterMaxFollowers(e.target.value ? Number(e.target.value) : "")}
          />
          <Button variant="ghost" size="sm" onClick={() => { setFilterMinAvgViews(""); setFilterMinMedianViews(""); setFilterMaxFollowers(""); }}>
            Сбросить
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет добавленных аккаунтов</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить первый аккаунт
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    checked={selected.size === filteredAccounts.length && filteredAccounts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                {visibleColumns.has("platform") && <TableHead>Платформа</TableHead>}
                {visibleColumns.has("followers") && <TableHead className="text-right">Подписчики</TableHead>}
                {visibleColumns.has("avgViews") && <TableHead className="text-right">Ср. просмотры</TableHead>}
                {visibleColumns.has("median") && <TableHead className="text-right">Медиана</TableHead>}
                {visibleColumns.has("er") && <TableHead className="text-right">Ср. ER</TableHead>}
                {visibleColumns.has("category") && <TableHead>Категория</TableHead>}
                {visibleColumns.has("lastScraped") && <TableHead>Последний сбор</TableHead>}
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  data-selected={selected.has(account.id)}
                  className="data-[selected=true]:bg-muted/50"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={selected.has(account.id)}
                      onChange={() => toggleSelect(account.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium hover:underline"
                      >
                        {account.displayName || account.username}
                      </Link>
                      <div className="flex items-center gap-0.5">
                        {(account.colorLabels ?? []).map((cl, i) => {
                          const pal = COLOR_PALETTE.find((p) => p.id === cl.color);
                          return (
                            <TooltipProvider key={i}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${pal?.bg ?? "bg-gray-400"} ring-1 ${pal?.ring ?? "ring-gray-300"} ring-offset-1`} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {cl.text}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        <ColorLabelPopover account={account} onUpdate={fetchAccounts} />
                      </div>
                    </div>
                  </TableCell>
                  {visibleColumns.has("platform") && (
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {account.platform}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.has("followers") && (
                    <TableCell className="text-right">
                      {formatNumber(account.followersCount)}
                    </TableCell>
                  )}
                  {visibleColumns.has("avgViews") && (
                    <TableCell className="text-right">
                      {formatNumber(account.avgViews)}
                    </TableCell>
                  )}
                  {visibleColumns.has("median") && (
                    <TableCell className="text-right">
                      {formatNumber(account.medianViews)}
                    </TableCell>
                  )}
                  {visibleColumns.has("er") && (
                    <TableCell className="text-right">
                      {formatPercent(account.avgEngagementRate)}
                    </TableCell>
                  )}
                  {visibleColumns.has("category") && (
                    <TableCell>
                      <Select
                        value={account.category}
                        onValueChange={async (v) => {
                          if (v === "__new__") {
                            setNewCategoryAccountId(account.id);
                            setNewCategoryValue("");
                            setNewCategoryDialogOpen(true);
                            return;
                          }
                          if (v === "__manage__") {
                            setReassignFrom(null);
                            setManageCategoriesOpen(true);
                            return;
                          }
                          await updateAccount(account.id, { category: v });
                          fetchAccounts();
                        }}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueCategories.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">
                              {c}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__" className="text-xs text-muted-foreground">
                            + Новая категория...
                          </SelectItem>
                          <SelectItem value="__manage__" className="text-xs text-muted-foreground">
                            Управление категориями...
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {visibleColumns.has("lastScraped") && (
                    <TableCell className="text-muted-foreground text-sm">
                      {account.scrapeStatus === "in_progress" ? (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          Сбор...
                        </Badge>
                      ) : account.scrapeStatus === "error" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="destructive" className="text-xs cursor-pointer" onClick={async () => {
                                const res = await triggerScrapeAccount(account.id);
                                if (res.success) {
                                  toast.success("Сбор данных запущен");
                                  setTimeout(fetchAccounts, 2000);
                                } else {
                                  toast.error("Ошибка запуска сбора");
                                }
                              }}>
                                Ошибка сбора
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Ошибка сбора. Нажмите для повтора</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        formatDate(account.lastScrapedAt)
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                await updateAccount(account.id, { autoScrape: !account.autoScrape });
                                fetchAccounts();
                              }}
                            >
                              {account.autoScrape ? (
                                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <RefreshCwOff className="h-3.5 w-3.5 text-muted-foreground/30" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {account.autoScrape ? "Авто-скрейп включён" : "Авто-скрейп выключен"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {account.scrapeStatus === "in_progress" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  await updateScrapeStatus(account.id, "error");
                                  toast.success("Задача остановлена");
                                  fetchAccounts();
                                }}
                              >
                                <Square className="h-3.5 w-3.5 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Остановить задачу</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Обновить данные"
                          onClick={async () => {
                            const res = await triggerScrapeAccount(account.id);
                            if (res.success) {
                              toast.success("Сбор данных запущен");
                              setTimeout(fetchAccounts, 2000);
                            } else {
                              toast.error("Ошибка запуска сбора");
                            }
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <a href={account.url} target="_blank" rel="noopener noreferrer">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить аккаунт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Платформа</Label>
              <Select value={formPlatform} onValueChange={setFormPlatform}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="url">URL или username</Label>
              <Input
                id="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://tiktok.com/@username или @username"
              />
            </div>
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Теги</Label>
              <TagInput
                value={formTags}
                onChange={setFormTags}
                placeholder="фитнес, мотивация"
              />
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

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeleteVideos(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить аккаунты?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Будет удалено {selected.size} аккаунт(ов).
            </p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer"
                checked={deleteVideos}
                onChange={(e) => setDeleteVideos(e.target.checked)}
              />
              <span className="text-sm">
                Также удалить все видео этих аккаунтов
                {(() => {
                  const total = Array.from(selected)
                    .map((id) => accounts.find((a) => a.id === id)?._count.videos ?? 0)
                    .reduce((a, b) => a + b, 0);
                  return total > 0 ? ` (${total} шт.)` : "";
                })()}
              </span>
            </label>
            {!deleteVideos && (
              <p className="text-xs text-muted-foreground">
                Видео останутся в разделе «Видео» без привязки к аккаунту.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteVideos(false); }}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageCategoriesOpen} onOpenChange={(open) => {
        setManageCategoriesOpen(open);
        if (!open) {
          setReassignFrom(null);
          setEditingCategory(null);
          setEditCategoryValue("");
          setNewCatInput("");
          setRemovedCategories(new Set());
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Управление категориями</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-[400px] overflow-y-auto">
            {uniqueCategories.map((cat) => {
              const count = accounts.filter((a) => a.category === cat).length;
              const isEditing = editingCategory === cat;
              const isReassigning = reassignFrom === cat;

              if (isReassigning) {
                return (
                  <div key={cat} className="rounded-md border bg-muted/30 p-3 space-y-3">
                    <p className="text-sm">
                      Переназначить <span className="font-medium">{count}</span> акк. из <span className="font-medium">«{cat}»</span> в:
                    </p>
                    <Select value={reassignTo} onValueChange={setReassignTo}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.filter((c) => c !== cat).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setReassignFrom(null)}>
                        Отмена
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={reassigning}
                        onClick={async () => {
                          setReassigning(true);
                          const targets = accounts.filter((a) => a.category === cat);
                          await Promise.all(targets.map((a) => updateAccount(a.id, { category: reassignTo })));
                          toast.success(`Переназначено ${targets.length} аккаунт(ов)`);
                          setReassignFrom(null);
                          setReassigning(false);
                          fetchAccounts();
                        }}
                      >
                        {reassigning ? "..." : "Подтвердить"}
                      </Button>
                    </div>
                  </div>
                );
              }

              if (isEditing) {
                return (
                  <div key={cat} className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/50">
                    <Input
                      className="h-7 text-sm flex-1"
                      value={editCategoryValue}
                      onChange={(e) => setEditCategoryValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const newName = editCategoryValue.trim();
                          if (!newName || newName === cat) {
                            setEditingCategory(null);
                            return;
                          }
                          if (uniqueCategories.includes(newName)) {
                            toast.error("Категория с таким названием уже существует");
                            return;
                          }
                          const targets = accounts.filter((a) => a.category === cat);
                          await Promise.all(targets.map((a) => updateAccount(a.id, { category: newName })));
                          setExtraCategories((prev) =>
                            prev.includes(cat) ? prev.map((c) => (c === cat ? newName : c)) : [...prev, newName]
                          );
                          setEditingCategory(null);
                          toast.success(`Категория «${cat}» переименована в «${newName}»`);
                          fetchAccounts();
                        }
                        if (e.key === "Escape") {
                          setEditingCategory(null);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={async () => {
                        const newName = editCategoryValue.trim();
                        if (!newName || newName === cat) {
                          setEditingCategory(null);
                          return;
                        }
                        if (uniqueCategories.includes(newName)) {
                          toast.error("Категория с таким названием уже существует");
                          return;
                        }
                        const targets = accounts.filter((a) => a.category === cat);
                        await Promise.all(targets.map((a) => updateAccount(a.id, { category: newName })));
                        setExtraCategories((prev) =>
                          prev.includes(cat) ? prev.map((c) => (c === cat ? newName : c)) : [...prev, newName]
                        );
                        setEditingCategory(null);
                        toast.success(`Категория «${cat}» переименована в «${newName}»`);
                        fetchAccounts();
                      }}
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setEditingCategory(null)}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                );
              }

              return (
                <div key={cat} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat}</span>
                    <span className="text-xs text-muted-foreground">{count} акк.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingCategory(cat);
                        setEditCategoryValue(cat);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (count === 0) {
                          setExtraCategories((prev) => prev.filter((c) => c !== cat));
                          setRemovedCategories((prev) => new Set(prev).add(cat));
                          toast.success(`Категория «${cat}» удалена`);
                        } else {
                          setReassignFrom(cat);
                          setReassignTo(uniqueCategories.find((c) => c !== cat) || CATEGORIES[0]);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Название категории"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const name = newCatInput.trim();
                  if (!name) return;
                  if (uniqueCategories.includes(name)) {
                    toast.error("Категория с таким названием уже существует");
                    return;
                  }
                  setExtraCategories((prev) => [...prev, name]);
                  setNewCatInput("");
                  toast.success(`Категория «${name}» добавлена`);
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!newCatInput.trim() || uniqueCategories.includes(newCatInput.trim())}
              onClick={() => {
                const name = newCatInput.trim();
                if (!name || uniqueCategories.includes(name)) return;
                setExtraCategories((prev) => [...prev, name]);
                setNewCatInput("");
                toast.success(`Категория «${name}» добавлена`);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Добавить
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageCategoriesOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Новая категория</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-category">Название</Label>
            <Input
              id="new-category"
              value={newCategoryValue}
              onChange={(e) => setNewCategoryValue(e.target.value)}
              placeholder="Например: partner"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newCategoryValue.trim()) {
                  await updateAccount(newCategoryAccountId, { category: newCategoryValue.trim() });
                  setNewCategoryDialogOpen(false);
                  fetchAccounts();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              disabled={!newCategoryValue.trim()}
              onClick={async () => {
                await updateAccount(newCategoryAccountId, { category: newCategoryValue.trim() });
                setNewCategoryDialogOpen(false);
                fetchAccounts();
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
