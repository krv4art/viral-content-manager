"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { getCreators, createCreator, triggerCreateCreatorFromPrototype } from "@/actions/creators";
import { getAccounts } from "@/actions/accounts";
import { useCurrentProject } from "@/components/layout/project-provider";
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

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Черновик", variant: "outline" },
  active: { label: "Активный", variant: "default" },
  archived: { label: "Архив", variant: "secondary" },
};

type CreatorItem = {
  id: string;
  name: string;
  summary: string | null;
  status: string;
  visualStyle: string | null;
  prototypeAccount: {
    username: string;
    platform: string;
    displayName: string | null;
  } | null;
};

export default function CreatorsPage() {
  const { projectId } = useCurrentProject();
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formName, setFormName] = useState("");
  const [formSummary, setFormSummary] = useState("");

  const [protoDialogOpen, setProtoDialogOpen] = useState(false);
  const [protoAccountId, setProtoAccountId] = useState("");
  const [protoCreatorName, setProtoCreatorName] = useState("");
  const [protoSaving, setProtoSaving] = useState(false);
  const [protoAccounts, setProtoAccounts] = useState<Array<{ id: string; username: string; platform: string }>>([]);

  const fetchCreators = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getCreators(projectId, {
      status: filterStatus !== "all" ? filterStatus : undefined,
    });
    if (res.success && res.data) {
      setCreators(res.data as unknown as CreatorItem[]);
    }
    setLoading(false);
  }, [projectId, filterStatus]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  useEffect(() => {
    if (protoDialogOpen && projectId) {
      getAccounts(projectId).then((res) => {
        if (res.success && res.data) {
          setProtoAccounts(
            (res.data as unknown as Array<Record<string, unknown>>).map((a) => ({
              id: a.id as string,
              username: a.username as string,
              platform: a.platform as string,
            }))
          );
        }
      });
    }
  }, [protoDialogOpen, projectId]);

  const handleCreateFromPrototype = async () => {
    if (!projectId || !protoAccountId || !protoCreatorName.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    setProtoSaving(true);
    const res = await triggerCreateCreatorFromPrototype(projectId, protoAccountId, protoCreatorName);
    if (res.success) {
      toast.success("Документ создаётся, займёт 1–2 мин");
      setProtoDialogOpen(false);
      setProtoAccountId("");
      setProtoCreatorName("");
      fetchCreators();
    } else {
      toast.error("Ошибка при создании криейтора");
    }
    setProtoSaving(false);
  };

  const handleCreate = async () => {
    if (!projectId || !formName.trim()) {
      toast.error("Укажите имя криейтора");
      return;
    }
    setSaving(true);
    const res = await createCreator({
      projectId,
      name: formName,
      summary: formSummary || undefined,
    });
    if (res.success) {
      toast.success("Криейтор создан");
      setDialogOpen(false);
      setFormName("");
      setFormSummary("");
      fetchCreators();
    } else {
      toast.error("Ошибка при создании криейтора");
    }
    setSaving(false);
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Выберите проект для просмотра криейторов</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Криейторы</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setProtoDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Создать из прототипа
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Новый криейтор
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="draft">Черновик</SelectItem>
            <SelectItem value="active">Активный</SelectItem>
            <SelectItem value="archived">Архив</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">Нет криейторов</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать первого криейтора
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => {
            const statusInfo = STATUS_MAP[creator.status] || {
              label: creator.status,
              variant: "outline" as const,
            };
            return (
              <Link key={creator.id} href={`/creators/${creator.id}`}>
                <Card className="hover:bg-accent/50 transition-colors h-full">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold">
                        {creator.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {creator.name}
                        </h3>
                        {creator.prototypeAccount && (
                          <p className="text-xs text-muted-foreground">
                            Прототип: @{creator.prototypeAccount.username}(
                            {creator.prototypeAccount.platform})
                          </p>
                        )}
                      </div>
                      <Badge variant={statusInfo.variant} className="shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {creator.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {creator.summary}
                      </p>
                    )}
                    {creator.visualStyle && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Стиль:</span>{" "}
                        {creator.visualStyle}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый криейтор</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="creator-name">Имя</Label>
              <Input
                id="creator-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Имя криейтора"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-summary">Описание</Label>
              <Textarea
                id="creator-summary"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                rows={3}
                placeholder="Краткое описание..."
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

      <Dialog open={protoDialogOpen} onOpenChange={setProtoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать из прототипа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Аккаунт-прототип</Label>
              <Select value={protoAccountId} onValueChange={setProtoAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите аккаунт" />
                </SelectTrigger>
                <SelectContent>
                  {protoAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      @{a.username} ({a.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proto-name">Имя криейтора</Label>
              <Input
                id="proto-name"
                value={protoCreatorName}
                onChange={(e) => setProtoCreatorName(e.target.value)}
                placeholder="Имя нового криейтора"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProtoDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateFromPrototype} disabled={protoSaving}>
              {protoSaving ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
