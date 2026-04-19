"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw, ExternalLink } from "lucide-react";
import { getAccounts, createAccount } from "@/actions/accounts";
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

const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter"];
const CATEGORIES = ["competitor", "inspiration", "own", "trending"];

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
  lastScrapedAt: Date | null;
  scrapeStatus: string;
  _count: { videos: number };
};

export default function AccountsPage() {
  const { projectId } = useCurrentProject();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [formPlatform, setFormPlatform] = useState("tiktok");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("competitor");
  const [formTags, setFormTags] = useState("");

  const fetchAccounts = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getAccounts(projectId, {
      platform: filterPlatform !== "all" ? filterPlatform : undefined,
      category: filterCategory !== "all" ? filterCategory : undefined,
    });
    if (res.success && res.data) {
      setAccounts(res.data as unknown as Account[]);
    }
    setLoading(false);
  }, [projectId, filterPlatform, filterCategory]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    if (res.success) {
      toast.success("Аккаунт добавлен");
      setDialogOpen(false);
      setFormUrl("");
      setFormTags("");
      fetchAccounts();
    } else {
      toast.error("Ошибка при добавлении аккаунта");
    }
    setSaving(false);
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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить аккаунт
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[160px]">
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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
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
                <TableHead>Username</TableHead>
                <TableHead>Платформа</TableHead>
                <TableHead className="text-right">Подписчики</TableHead>
                <TableHead className="text-right">Ср. просмотры</TableHead>
                <TableHead className="text-right">Ср. ER</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Последний сбор</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="font-medium hover:underline"
                    >
                      {account.displayName || account.username}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {account.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(account.followersCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(account.avgViews)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(account.avgEngagementRate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {account.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(account.lastScrapedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Обновить данные"
                        onClick={() => toast.info("Сбор данных запущен")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/accounts/${account.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
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
    </div>
  );
}
