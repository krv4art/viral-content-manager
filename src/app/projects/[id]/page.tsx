"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getProject, updateProject, deleteProject } from "@/actions/projects";
import { useCurrentProject } from "@/components/layout/project-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter"];

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  websiteUrl: string | null;
  productDoc: string | null;
  targetPlatforms: string[];
  targetRegions: string[];
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { setProject } = useCurrentProject();
  const projectId = params.id as string;

  const [project, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [productDoc, setProductDoc] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [targetRegions, setTargetRegions] = useState("");

  const fetchProject = useCallback(async () => {
    const res = await getProject(projectId);
    if (res.success && res.data) {
      const p = res.data;
      setProjectData(p as unknown as ProjectData);
      setName(p.name);
      setDescription(p.description || "");
      setAppStoreUrl(p.appStoreUrl || "");
      setPlayStoreUrl(p.playStoreUrl || "");
      setWebsiteUrl(p.websiteUrl || "");
      setProductDoc(p.productDoc || "");
      setTargetPlatforms(p.targetPlatforms);
      setTargetRegions(p.targetRegions.join(", "));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Укажите название проекта");
      return;
    }
    setSaving(true);
    const regions = targetRegions
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const res = await updateProject(projectId, {
      name,
      description: description || undefined,
      appStoreUrl: appStoreUrl || undefined,
      playStoreUrl: playStoreUrl || undefined,
      websiteUrl: websiteUrl || undefined,
      productDoc: productDoc || undefined,
      targetPlatforms,
      targetRegions: regions,
    });

    if (res.success) {
      toast.success("Проект обновлен");
      setProject(projectId, name);
      fetchProject();
    } else {
      toast.error("Ошибка при обновлении");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const res = await deleteProject(projectId);
    if (res.success) {
      toast.success("Проект удален");
      router.push("/projects");
    } else {
      toast.error("Ошибка при удалении");
    }
  };

  const togglePlatform = (p: string) => {
    setTargetPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Проект не найден</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Настройки проекта</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Описание</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="appstore">App Store URL</Label>
              <Input
                id="appstore"
                value={appStoreUrl}
                onChange={(e) => setAppStoreUrl(e.target.value)}
                placeholder="https://apps.apple.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playstore">Play Store URL</Label>
              <Input
                id="playstore"
                value={playStoreUrl}
                onChange={(e) => setPlayStoreUrl(e.target.value)}
                placeholder="https://play.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Целевые платформы</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={targetPlatforms.includes(p) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlatform(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regions">Целевые регионы</Label>
            <Input
              id="regions"
              value={targetRegions}
              onChange={(e) => setTargetRegions(e.target.value)}
              placeholder="RU, US, KZ (через запятую)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Doc</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={productDoc}
            onChange={(e) => setProductDoc(e.target.value)}
            rows={12}
            placeholder="Документация продукта, описание фичей, позиционирование..."
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить проект
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Проект &laquo;{project.name}&raquo; и все связанные данные будут
            удалены без возможности восстановления.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
