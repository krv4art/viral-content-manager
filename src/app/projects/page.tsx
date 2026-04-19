"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { getProjects, createProject, updateProject, deleteProject } from "@/actions/projects";
import { useCurrentProject } from "@/components/layout/project-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PLATFORMS = ["tiktok", "instagram", "youtube", "twitter"];

type Project = {
  id: string;
  name: string;
  description: string | null;
  targetPlatforms: string[];
  targetRegions: string[];
  _count: {
    accounts: number;
    hooks: number;
    scripts: number;
    creators: number;
    trends: number;
    hypotheses: number;
    knowledge: number;
  };
};

interface ProjectFormData {
  name: string;
  description: string;
  appStoreUrl: string;
  playStoreUrl: string;
  websiteUrl: string;
  productDoc: string;
  targetPlatforms: string[];
  targetRegions: string;
}

const emptyForm: ProjectFormData = {
  name: "",
  description: "",
  appStoreUrl: "",
  playStoreUrl: "",
  websiteUrl: "",
  productDoc: "",
  targetPlatforms: [],
  targetRegions: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { setProject } = useCurrentProject();

  const fetchProjects = useCallback(async () => {
    const res = await getProjects();
    if (res.success && res.data) {
      setProjects(res.data as unknown as Project[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreate = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description || "",
      appStoreUrl: "",
      playStoreUrl: "",
      websiteUrl: "",
      productDoc: "",
      targetPlatforms: project.targetPlatforms,
      targetRegions: project.targetRegions.join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Укажите название проекта");
      return;
    }
    setSaving(true);
    const platforms = form.targetPlatforms;
    const regions = form.targetRegions
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (editingProject) {
      const res = await updateProject(editingProject.id, {
        name: form.name,
        description: form.description || undefined,
        targetPlatforms: platforms,
        targetRegions: regions,
      });
      if (res.success) {
        toast.success("Проект обновлен");
        setDialogOpen(false);
        fetchProjects();
      } else {
        toast.error("Ошибка при обновлении проекта");
      }
    } else {
      const res = await createProject({
        name: form.name,
        description: form.description || undefined,
        targetPlatforms: platforms,
        targetRegions: regions,
      });
      if (res.success && res.data) {
        toast.success("Проект создан");
        setProject(res.data.id, res.data.name);
        setDialogOpen(false);
        fetchProjects();
      } else {
        toast.error("Ошибка при создании проекта");
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    const res = await deleteProject(deletingProject.id);
    if (res.success) {
      toast.success("Проект удален");
      setDeleteDialogOpen(false);
      setDeletingProject(null);
      fetchProjects();
    } else {
      toast.error("Ошибка при удалении проекта");
    }
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter((p) => p !== platform)
        : [...prev.targetPlatforms, platform],
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Проекты</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Новый проект
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">У вас пока нет проектов</p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Создать первый проект
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Настройки
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDeletingProject(project);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.targetPlatforms.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                  <div>
                    <div className="font-semibold text-foreground">
                      {project._count.accounts}
                    </div>
                    <div>Аккаунты</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {project._count.hooks}
                    </div>
                    <div>Хуки</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {project._count.scripts}
                    </div>
                    <div>Сценарии</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {project._count.hypotheses}
                    </div>
                    <div>Гипотезы</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Редактировать проект" : "Новый проект"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Мой проект"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Описание проекта"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Целевые платформы</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={
                      form.targetPlatforms.includes(p) ? "default" : "outline"
                    }
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
                value={form.targetRegions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetRegions: e.target.value }))
                }
                placeholder="RU, US, KZ (через запятую)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : editingProject ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Проект &laquo;{deletingProject?.name}&raquo; будет удален без
            возможности восстановления. Все связанные данные будут потеряны.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
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
