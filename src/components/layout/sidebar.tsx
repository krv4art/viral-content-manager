"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  User,
  Video,
  Anchor,
  FileText,
  Drama,
  Flame,
  Tags,
  FlaskConical,
  BookOpen,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/projects", label: "Проекты", icon: FolderOpen },
  { href: "/accounts", label: "Аккаунты", icon: User },
  { href: "/videos", label: "Видео", icon: Video },
  { href: "/hooks", label: "Хуки", icon: Anchor },
  { href: "/scripts", label: "Сценарии", icon: FileText },
  { href: "/carousels", label: "Карусели", icon: LayoutGrid },
  { href: "/creators", label: "Криейторы", icon: Drama },
  { href: "/trends", label: "Тренды", icon: Flame },
  { href: "/keywords", label: "Ключевые слова", icon: Tags },
  { href: "/hypotheses", label: "Гипотезы", icon: FlaskConical },
  { href: "/knowledge", label: "База знаний", icon: BookOpen },
  { href: "/settings", label: "Настройки", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navContent = (
    <nav className="flex-1 overflow-y-auto py-2">
      <ul className="space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          const link = (
            <Link
              href={item.href}
              onClick={() => onMobileOpenChange?.(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          return (
            <li key={item.href}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const headerContent = (
    <div className="flex h-14 items-center border-b border-zinc-800 px-4">
      {!collapsed && (
        <span className="text-sm font-semibold text-zinc-100 truncate">
          Viral Content Manager
        </span>
      )}
      {collapsed && (
        <span className="mx-auto text-sm font-bold text-zinc-100">V</span>
      )}
    </div>
  );

  const collapseToggle = (
    <div className="border-t border-zinc-800 p-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
          collapsed ? "justify-center" : "justify-end"
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            "hidden md:flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
            sidebarWidth
          )}
        >
          {headerContent}
          {navContent}
          {collapseToggle}
        </aside>
      </TooltipProvider>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="p-0 w-64 bg-zinc-950 border-zinc-800">
          <div className="flex h-screen flex-col">
            <div className="flex h-14 items-center border-b border-zinc-800 px-4">
              <span className="text-sm font-semibold text-zinc-100 truncate">
                Viral Content Manager
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              <ul className="space-y-1 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onMobileOpenChange?.(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
