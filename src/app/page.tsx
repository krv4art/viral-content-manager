"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Video,
  Anchor,
  FileText,
  FlaskConical,
  Plus,
  TrendingUp,
  Flame,
} from "lucide-react";
import { useCurrentProject } from "@/components/layout/project-provider";
import { getProjectStats } from "@/actions/projects";
import { getTopVideos } from "@/actions/videos";
import { getHypotheses } from "@/actions/hypotheses";
import { getTrends } from "@/actions/trends";
import { formatNumber, formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const { projectId } = useCurrentProject();
  const [stats, setStats] = useState<{
    accounts: number;
    videos: number;
    hooks: number;
    scripts: number;
    hypotheses: number;
  } | null>(null);
  const [topVideos, setTopVideos] = useState<
    Array<{
      id: string;
      description: string | null;
      viewsCount: number | null;
      url: string;
      account: { username: string; platform: string } | null;
      postedAt: Date | null;
    }>
  >([]);
  const [activeHypotheses, setActiveHypotheses] = useState<
    Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
    }>
  >([]);
  const [hotTrends, setHotTrends] = useState<
    Array<{
      id: string;
      title: string;
      type: string;
      relevance: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getProjectStats(projectId),
      getTopVideos(projectId, 5),
      getHypotheses(projectId),
      getTrends(projectId, { relevance: "hot" }),
    ]).then(([statsRes, videosRes, hypRes, trendsRes]) => {
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (videosRes.success && videosRes.data) setTopVideos(videosRes.data);
      if (hypRes.success && hypRes.data) {
        setActiveHypotheses(
          hypRes.data.filter(
            (h: { status: string }) =>
              h.status === "in_production" || h.status === "published"
          )
        );
      }
      if (trendsRes.success && trendsRes.data) setHotTrends(trendsRes.data);
      setLoading(false);
    });
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Добро пожаловать</h2>
          <p className="text-muted-foreground mb-6">
            Выберите проект в верхней панели или создайте новый, чтобы начать
            работу с контент-менеджером.
          </p>
          <Link href="/projects">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать проект
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Аккаунты",
      value: stats?.accounts ?? 0,
      icon: Users,
      href: "/accounts",
    },
    {
      label: "Видео",
      value: stats?.videos ?? 0,
      icon: Video,
      href: "/videos",
    },
    {
      label: "Хуки",
      value: stats?.hooks ?? 0,
      icon: Anchor,
      href: "/hooks",
    },
    {
      label: "Сценарии",
      value: stats?.scripts ?? 0,
      icon: FileText,
      href: "/scripts",
    },
    {
      label: "Гипотезы",
      value: stats?.hypotheses ?? 0,
      icon: FlaskConical,
      href: "/hypotheses",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <div className="flex gap-2">
          <Link href="/accounts">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Добавить аккаунт
            </Button>
          </Link>
          <Link href="/videos">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Добавить видео
            </Button>
          </Link>
          <Link href="/hypotheses">
            <Button size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Новая гипотеза
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {card.label}
                        </p>
                        <p className="text-2xl font-bold">
                          {formatNumber(card.value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ видео по просмотрам</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : topVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Нет видео. Добавьте аккаунты и видео для анализа.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Описание</TableHead>
                    <TableHead>Аккаунт</TableHead>
                    <TableHead className="text-right">Просмотры</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVideos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="max-w-[200px] truncate">
                        <Link
                          href={`/videos/${video.id}`}
                          className="hover:underline"
                        >
                          {video.description || "Без описания"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {video.account?.username || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(video.viewsCount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(video.postedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Активные гипотезы</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : activeHypotheses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Нет активных гипотез
                </p>
              ) : (
                <div className="space-y-2">
                  {activeHypotheses.slice(0, 5).map((h) => (
                    <Link
                      key={h.id}
                      href={`/hypotheses`}
                      className="flex items-center justify-between rounded-md border p-2 hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm truncate">{h.title}</span>
                      <Badge
                        variant={
                          h.status === "in_production"
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2 shrink-0"
                      >
                        {h.status === "in_production"
                          ? "В производстве"
                          : "Опубликовано"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-red-500" />
                Горячие тренды
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : hotTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Нет горячих трендов
                </p>
              ) : (
                <div className="space-y-2">
                  {hotTrends.slice(0, 5).map((t) => (
                    <Link
                      key={t.id}
                      href="/trends"
                      className="flex items-center justify-between rounded-md border p-2 hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm truncate">{t.title}</span>
                      <Badge variant="destructive" className="ml-2 shrink-0">
                        {t.type}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
