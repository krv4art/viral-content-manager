"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, FileDown, Plus, X } from "lucide-react";
import { getCreator, updateCreator, checkRunwareKey } from "@/actions/creators";
import { useCurrentProject } from "@/components/layout/project-provider";
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

export default function CreatorDetailPage() {
  const params = useParams();
  const { projectId } = useCurrentProject();
  const creatorId = params.id as string;

  const [creator, setCreatorData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [appearance, setAppearance] = useState("");
  const [voiceAndSpeech, setVoiceAndSpeech] = useState("");
  const [personality, setPersonality] = useState("");
  const [background, setBackground] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [newRefUrl, setNewRefUrl] = useState("");

  const fetchCreator = useCallback(async () => {
    const res = await getCreator(creatorId);
    if (res.success && res.data) {
      const c = res.data as unknown as Record<string, unknown>;
      setCreatorData(c);
      setName(c.name as string);
      setSummary((c.summary as string) || "");
      setAppearance((c.appearance as string) || "");
      setVoiceAndSpeech((c.voiceAndSpeech as string) || "");
      setPersonality((c.personality as string) || "");
      setBackground((c.background as string) || "");
      setVisualStyle((c.visualStyle as string) || "");
      setImageGenPrompt((c.imageGenPrompt as string) || "");
      setStatus(c.status as string);
      setNotes((c.notes as string) || "");
      setReferenceImages((c.referenceImages as string[]) || []);
    }
    setLoading(false);
  }, [creatorId]);

  useEffect(() => {
    fetchCreator();
  }, [fetchCreator]);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCreator(creatorId, {
      name,
      summary: summary || undefined,
      appearance: appearance || undefined,
      voiceAndSpeech: voiceAndSpeech || undefined,
      personality: personality || undefined,
      background: background || undefined,
      visualStyle: visualStyle || undefined,
      imageGenPrompt: imageGenPrompt || undefined,
      referenceImages,
      status,
      notes: notes || undefined,
    });
    if (res.success) {
      toast.success("Криейтор обновлен");
      fetchCreator();
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSaving(false);
  };

  const handleExportMarkdown = () => {
    if (!creator) return;
    const md = `# ${name}

## Описание
${summary}

## Внешность
${appearance}

## Голос и речь
${voiceAndSpeech}

## Характер
${personality}

## Предыстория
${background}

## Визуальный стиль
${visualStyle}

## Промпт для генерации изображений
${imageGenPrompt}

## Заметки
${notes}
`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Экспорт завершен");
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Криейтор не найден</p>
      </div>
    );
  }

  const generatedImages = (creator.generatedImages as string[]) || [];
  const topHooks = creator.topHooks as Record<string, unknown> | null;
  const topScripts = creator.topScripts as Record<string, unknown> | null;
  const prototypeAccount = creator.prototypeAccount as Record<string, unknown> | null;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/creators">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold">
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{name}</h1>
            {prototypeAccount && (
              <p className="text-sm text-muted-foreground">
                Прототип: @{prototypeAccount.username as string}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMarkdown}>
            <FileDown className="mr-2 h-4 w-4" />
            Экспорт MD
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Имя</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Черновик</SelectItem>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="archived">Архив</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Характеристики персонажа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Внешность</Label>
            <Textarea
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
              rows={3}
              placeholder="Описание внешности..."
            />
          </div>
          <div className="space-y-2">
            <Label>Голос и речь</Label>
            <Textarea
              value={voiceAndSpeech}
              onChange={(e) => setVoiceAndSpeech(e.target.value)}
              rows={3}
              placeholder="Особенности голоса и речи..."
            />
          </div>
          <div className="space-y-2">
            <Label>Характер</Label>
            <Textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={3}
              placeholder="Черты характера..."
            />
          </div>
          <div className="space-y-2">
            <Label>Предыстория</Label>
            <Textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={3}
              placeholder="Предыстория персонажа..."
            />
          </div>
          <div className="space-y-2">
            <Label>Визуальный стиль</Label>
            <Textarea
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
              rows={2}
              placeholder="Описание визуального стиля..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Генерация изображений</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Промпт для генерации</Label>
            <Textarea
              value={imageGenPrompt}
              onChange={(e) => setImageGenPrompt(e.target.value)}
              rows={4}
              placeholder="Промпт для генерации изображений..."
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await checkRunwareKey();
                if (!res.available) {
                  toast.error("Runware API key не настроен");
                } else {
                  toast.info("Генерация изображений будет реализована после получения ключа");
                }
              }}
            >
              Сгенерировать
            </Button>
          </div>

          <div className="space-y-3">
            <Label>Референсные изображения ({referenceImages.length})</Label>
            {referenceImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет референсных изображений</p>
            ) : (
              <div className="space-y-2">
                {referenceImages.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-10 w-14 rounded bg-muted overflow-hidden shrink-0">
                      <img src={url} alt={`Ref ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <Input
                      value={url}
                      readOnly
                      className="flex-1 text-sm h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setReferenceImages((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newRefUrl}
                onChange={(e) => setNewRefUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRefUrl.trim()) {
                    setReferenceImages((prev) => [...prev, newRefUrl.trim()]);
                    setNewRefUrl("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newRefUrl.trim()) {
                    setReferenceImages((prev) => [...prev, newRefUrl.trim()]);
                    setNewRefUrl("");
                  }
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Сгенерированные изображения ({generatedImages.length})</Label>
            {generatedImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Нет сгенерированных изображений
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {generatedImages.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md bg-muted overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`Generated ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(topHooks || topScripts) && (
        <Card>
          <CardHeader>
            <CardTitle>Лучшие хуки и сценарии из прототипа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topHooks && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">
                  ТОП ХУКИ
                </Label>
                <pre className="mt-1 text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                  {JSON.stringify(topHooks, null, 2)}
                </pre>
              </div>
            )}
            {topScripts && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">
                  ТОП СЦЕНАРИИ
                </Label>
                <pre className="mt-1 text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                  {JSON.stringify(topScripts, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Заметки</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Заметки о криейторе..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
