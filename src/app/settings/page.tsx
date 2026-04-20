"use client";

import { useEffect, useState } from "react";
import { Settings, Key, CalendarClock, Play, Wrench } from "lucide-react";
import { getSettings, updateSettings, triggerManualScrapeAll } from "@/actions/settings";
import { fixTikTokVideoUrls } from "@/actions/videos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatters";

type SettingsData = {
  scrapecreatorsApiKey: string | null;
  geminiApiKey: string | null;
  runwareApiKey: string | null;
  scrapecreatorsSource: "db" | "env" | "none";
  geminiSource: "db" | "env" | "none";
  runwareSource: "db" | "env" | "none";
  autoScrapeEnabled: boolean;
  lastAutoScrapeAt: Date | null;
};

type ApiKeyField = "scrapecreatorsApiKey" | "geminiApiKey" | "runwareApiKey";

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<ApiKeyField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [fixingUrls, setFixingUrls] = useState(false);

  const fetchSettings = async () => {
    const res = await getSettings();
    if (res.success && res.data) {
      setData(res.data as SettingsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveKey = async () => {
    if (!editField) return;
    setSaving(true);
    const res = await updateSettings({ [editField]: editValue.trim() });
    if (res.success) {
      toast.success("Ключ сохранён");
      setEditField(null);
      setEditValue("");
      fetchSettings();
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSaving(false);
  };

  const handleToggleAutoScrape = async (enabled: boolean) => {
    const res = await updateSettings({ autoScrapeEnabled: enabled });
    if (res.success) {
      setData((prev) => prev ? { ...prev, autoScrapeEnabled: enabled } : prev);
      toast.success(enabled ? "Авто-скрейп включён" : "Авто-скрейп отключён");
    } else {
      toast.error("Ошибка при обновлении");
    }
  };

  const handleManualScrape = async () => {
    setScraping(true);
    const res = await triggerManualScrapeAll();
    if (res.success) {
      toast.success(`Запущен скрейп ${(res as { count?: number }).count ?? 0} аккаунтов`);
    } else {
      toast.error("Ошибка запуска");
    }
    setScraping(false);
  };

  const API_KEYS: { field: ApiKeyField; label: string; description: string; optional?: boolean }[] = [
    { field: "scrapecreatorsApiKey", label: "ScrapeCreators API Key", description: "Скрейпинг TikTok и Instagram" },
    { field: "geminiApiKey", label: "Gemini API Key", description: "AI-анализ видео" },
    { field: "runwareApiKey", label: "Runware API Key", description: "Генерация изображений", optional: true },
  ];

  const sourceFieldMap: Record<ApiKeyField, keyof SettingsData> = {
    scrapecreatorsApiKey: "scrapecreatorsSource",
    geminiApiKey: "geminiSource",
    runwareApiKey: "runwareSource",
  };

  return (
    <div className="flex-1 space-y-8 p-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Настройки</h1>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">API-ключи</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Ключи из БД имеют приоритет над переменными окружения (env vars).
        </p>

        <div className="rounded-md border divide-y">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            : API_KEYS.map(({ field, label, description, optional }) => {
                const source = data?.[sourceFieldMap[field]] as "db" | "env" | "none" | undefined;
                const maskedValue = data?.[field] as string | null;
                const isSet = source !== "none";

                return (
                  <div key={field} className="flex items-center justify-between p-4 gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{label}</span>
                        {optional && (
                          <Badge variant="outline" className="text-xs">Опционально</Badge>
                        )}
                        <Badge
                          variant={isSet ? "default" : "secondary"}
                          className={`text-xs ${isSet ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}`}
                        >
                          {isSet ? "Задан" : "Не задан"}
                        </Badge>
                        {source === "env" && (
                          <span className="text-xs text-muted-foreground">из env</span>
                        )}
                        {source === "db" && (
                          <span className="text-xs text-muted-foreground">из БД</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      {maskedValue && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">{maskedValue}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => { setEditField(field); setEditValue(""); }}
                    >
                      Изменить
                    </Button>
                  </div>
                );
              })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Автоматизация</h2>
        </div>

        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Авто-скрейп аккаунтов</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Каждый понедельник в 03:00 UTC — обновляет статистику всех аккаунтов
              </p>
              {data?.lastAutoScrapeAt ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Последний запуск: {formatDate(data.lastAutoScrapeAt)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Ещё не запускался</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {loading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <Switch
                  checked={data?.autoScrapeEnabled ?? true}
                  onCheckedChange={handleToggleAutoScrape}
                />
              )}
            </div>
          </div>
          <div className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualScrape}
              disabled={scraping}
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              {scraping ? "Запуск..." : "Запустить сейчас"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Обслуживание</h2>
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <div>
            <p className="font-medium text-sm">Исправить ссылки TikTok-видео</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Заменяет CDN-ссылки (v16m.tiktokcdn-us.com/...) на правильные страницы TikTok для всех сохранённых видео
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={fixingUrls}
            onClick={async () => {
              setFixingUrls(true);
              const res = await fixTikTokVideoUrls();
              if ("error" in res) {
                toast.error("Ошибка: " + res.error);
              } else {
                toast.success(res.fixed === 0 ? "Все ссылки уже корректны" : `Исправлено ${res.fixed} видео`);
              }
              setFixingUrls(false);
            }}
          >
            {fixingUrls ? "Исправляю..." : "Исправить ссылки"}
          </Button>
        </div>
      </section>

      <Dialog open={!!editField} onOpenChange={(open) => { if (!open) setEditField(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Изменить {API_KEYS.find((k) => k.field === editField)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Введите новый ключ. Он будет сохранён в БД и получит приоритет над env var.
            </p>
            <Input
              type="password"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Вставьте API-ключ..."
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>Отмена</Button>
            <Button onClick={handleSaveKey} disabled={saving || !editValue.trim()}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
