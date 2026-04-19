"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Pin, Search, Eye, Pencil } from "lucide-react";
import { getArticles, createArticle, deleteArticle } from "@/actions/knowledge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "strategy", label: "Стратегия" },
  { id: "tools", label: "Инструменты" },
  { id: "platforms", label: "Платформы" },
  { id: "hooks", label: "Хуки" },
  { id: "scripts", label: "Сценарии" },
  { id: "formats", label: "Форматы" },
  { id: "ads", label: "Реклама" },
  { id: "analytics", label: "Аналитика" },
];

type ArticleItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string | null;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
};

export default function KnowledgePage() {
  const { projectId } = useCurrentProject();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewMode, setPreviewMode] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("strategy");
  const [formSource, setFormSource] = useState("");
  const [formTags, setFormTags] = useState("");

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const res = await getArticles(projectId || undefined, {
      category: activeCategory !== "all" ? activeCategory : undefined,
      search: searchQuery || undefined,
    });
    if (res.success && res.data) {
      setArticles(res.data as unknown as ArticleItem[]);
    }
    setLoading(false);
  }, [projectId, activeCategory, searchQuery]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("Заполните название и содержание");
      return;
    }
    setSaving(true);
    const res = await createArticle({
      projectId: projectId || undefined,
      title: formTitle,
      content: formContent,
      category: formCategory,
      source: formSource || undefined,
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    if (res.success) {
      toast.success("Статья создана");
      setDialogOpen(false);
      setFormTitle("");
      setFormContent("");
      setFormSource("");
      setFormTags("");
      fetchArticles();
    } else {
      toast.error("Ошибка при создании статьи");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteArticle(id);
    if (res.success) {
      toast.success("Статья удалена");
      fetchArticles();
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const groupedArticles = articles.reduce(
    (acc, article) => {
      const cat = article.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(article);
      return acc;
    },
    {} as Record<string, ArticleItem[]>
  );

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">База знаний</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая статья
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск статей..."
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">Нет статтей</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первую статью
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {articles
                .filter((a) => a.isPinned)
                .map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onDelete={handleDelete}
                    isPinned
                  />
                ))}
              {articles
                .filter((a) => !a.isPinned)
                .map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новая статья</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="art-title">Название</Label>
              <Input
                id="art-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Название статьи"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="art-source">Источник</Label>
                <Input
                  id="art-source"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="URL или название"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Содержание (Markdown)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? (
                    <>
                      <Pencil className="mr-1 h-3 w-3" />
                      Редактор
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-3 w-3" />
                      Превью
                    </>
                  )}
                </Button>
              </div>
              {previewMode ? (
                <div className="min-h-[200px] rounded-md border p-3 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{formContent}</ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={10}
                  placeholder="Напишите содержание в Markdown..."
                  className="font-mono text-sm"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="art-tags">Теги (через запятую)</Label>
              <Input
                id="art-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="виральный, хук, тренд"
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
    </div>
  );
}

function ArticleCard({
  article,
  onDelete,
  isPinned = false,
}: {
  article: ArticleItem;
  onDelete: (id: string) => void;
  isPinned?: boolean;
}) {
  const catLabel =
    CATEGORIES.find((c) => c.id === article.category)?.label ||
    article.category;

  return (
    <Card className={isPinned ? "border-primary/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isPinned && (
                <Pin className="h-3 w-3 text-primary shrink-0" />
              )}
              <Link
                href={`/knowledge/${article.id}`}
                className="font-semibold hover:underline text-sm"
              >
                {article.title}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {article.content.slice(0, 200)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {catLabel}
              </Badge>
              {article.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">
                {formatDate(article.createdAt)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/knowledge/${article.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Открыть
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(article.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

