"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAccount, updateAccount } from "@/actions/accounts";
import { formatNumber, formatPercent, formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const [account, setAccountData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchAccount = useCallback(async () => {
    const res = await getAccount(accountId);
    if (res.success && res.data) {
      setAccountData(res.data as unknown as Record<string, unknown>);
      setNotes((res.data as { notes?: string }).notes || "");
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateAccount(accountId, { notes });
    if (res.success) {
      toast.success("Заметки сохранены");
    } else {
      toast.error("Ошибка при сохранении");
    }
    setSavingNotes(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Аккаунт не найден</p>
      </div>
    );
  }

  const videos = (account.videos as Array<Record<string, unknown>>) || [];
  const videoCount = (account._count as { videos: number })?.videos || 0;

  return (
    <div className="flex-1 space-y-6 p-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {(account.displayName as string) || (account.username as string)}
        </h1>
        <Badge variant="secondary">{account.platform as string}</Badge>
        <Badge variant="outline">{account.category as string}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
                {(account.username as string)?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {account.displayName as string}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{account.username as string}
                </p>
                {(account.bio as string) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {account.bio as string}
                  </p>
                )}
                <a
                  href={account.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Открыть профиль
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Подписчики</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.followersCount as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Подписки</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.followingCount as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ср. просмотры</p>
                <p className="text-xl font-bold">
                  {formatNumber(account.avgViews as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ср. ER</p>
                <p className="text-xl font-bold">
                  {formatPercent(account.avgEngagementRate as number | null)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Видео</p>
                <p className="text-xl font-bold">{videoCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Последний сбор</p>
                <p className="text-sm font-medium">
                  {formatDate(account.lastScrapedAt as Date | null)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Видео ({videos.length})
        </h2>
        {videos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Нет видео с этого аккаунта
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Описание</TableHead>
                  <TableHead className="text-right">Просмотры</TableHead>
                  <TableHead className="text-right">Лайки</TableHead>
                  <TableHead className="text-right">ER</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id as string}>
                    <TableCell className="max-w-[300px] truncate">
                      <Link
                        href={`/videos/${video.id}`}
                        className="hover:underline"
                      >
                        {(video.description as string) || "Без описания"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.viewsCount as number | null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.likesCount as number | null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(video.engagementRate as number | null)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(video.postedAt as Date | null)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Заметки</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Заметки об аккаунте..."
        />
        <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm">
          {savingNotes ? "Сохранение..." : "Сохранить заметки"}
        </Button>
      </div>
    </div>
  );
}
