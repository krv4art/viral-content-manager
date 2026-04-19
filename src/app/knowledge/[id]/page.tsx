"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Pencil, Eye, Pin } from "lucide-react";
import { getArticle, updateArticle } from "@/actions/knowledge";
import { formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "strategy", label: "Стратегия" },
  { id: "tools", label: "Инструменты" },
  { id: "platforms", label: "Платформы" },
  { id: "hooks", label: "Хуки" },
  { id: "scripts", label: "Сценарии" },
  { id: "formats", label: "Форматы" },
  { id: "ads", label: "Реклама" },
  { id: "analytics", label: "Аналитика" },
];

export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticleData] = useState<{
    id: string;
    title: string;
    content: string;
    category: string;
    source: string | null;
    tags: string[];
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("strategy");
  const [source, setSource] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const fetchArticle = useCallback(async () => {
    const res = await getArticle(articleId);
    if (res.success && res.data) {
      const a = res.data;
      setArticleData(a as unknown as {
        id: string; title: string; content: string; category: string;
        source: string | null; tags: string[]; isPinned: boolean;
        createdAt: string; updatedAt: string;
      });
      setTitle(a.title);
      setContent(a.content);
      setCategory(a.category);
      setSource(a.source || "");
      setTagsInput((a.tags as string[]).join(", "));
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Заполните название и содержание");
      return;
    }
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await updateArticle(articleId, {
      title,
      content,
      category,
      source: source || undefined,
      tags,
    });
    if (res.success) {
      toast.success("Статья обновлена");
      setEditMode(false);
      fetchArticle();
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSaving(false);
  };

  const handleTogglePin = async () => {
    if (!article) return;
    const res = await updateArticle(articleId, {
      isPinned: !article.isPinned,
    });
    if (res.success) {
      toast.success(article.isPinned ? "Статья откреплена" : "Статья закреплена");
      fetchArticle();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Статья не найдена</p>
      </div>
    );
  }

  const catLabel =
    CATEGORIES.find((c) => c.id === category)?.label || category;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/knowledge">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {catLabel}
              </Badge>
              {article.isPinned && (
                <Badge variant="default" className="text-xs gap-1">
                  <Pin className="h-3 w-3" />
                  Закреплена
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(article.createdAt as string)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTogglePin}>
            <Pin className="mr-1 h-4 w-4" />
            {article.isPinned ? "Открепить" : "Закрепить"}
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Eye className="mr-1 h-4 w-4" />
                Просмотр
              </>
            ) : (
              <>
                <Pencil className="mr-1 h-4 w-4" />
                Редактировать
              </>
            )}
          </Button>
          {editMode && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </div>
      </div>

      {editMode ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Источник</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="URL или название"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Содержание (Markdown)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Теги (через запятую)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            {source && (
              <p className="text-sm text-muted-foreground mb-4">
                Источник: {source}
              </p>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {renderMarkdown(content)}
            </div>
            {((article.tags as string[]) || []).length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-1">
                  {(article.tags as string[]).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### "))
      return (
        <h3 key={i} className="text-base font-semibold mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    if (line.startsWith("## "))
      return (
        <h2 key={i} className="text-lg font-semibold mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    if (line.startsWith("# "))
      return (
        <h1 key={i} className="text-xl font-bold mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    if (line.startsWith("- "))
      return (
        <li key={i} className="ml-4 text-sm">
          {line.slice(2)}
        </li>
      );
    if (line.startsWith("**") && line.endsWith("**"))
      return (
        <p key={i} className="font-semibold text-sm">
          {line.slice(2, -2)}
        </p>
      );
    if (line.trim() === "") return <br key={i} />;
    return (
      <p key={i} className="text-sm">
        {line}
      </p>
    );
  });
}
