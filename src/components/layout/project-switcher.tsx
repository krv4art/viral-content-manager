"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { getProjects } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentProject } from "@/components/layout/project-provider";

type Project = {
  id: string;
  name: string;
  description?: string | null;
};

export function ProjectSwitcher() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const { projectId, projectName, setProject } = useCurrentProject();

  useEffect(() => {
    getProjects().then((result) => {
      if (result.success && result.data) {
        setProjects(
          result.data.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
          }))
        );
      }
    });
  }, []);

  const handleSelect = (id: string, name: string) => {
    setProject(id, name);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="max-w-[200px] truncate">
            {projectName ?? "Выберите проект"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 border-zinc-800 bg-zinc-950 p-2"
        align="start"
      >
        <div className="mb-2 px-2 text-xs font-medium text-zinc-500">
          Проекты
        </div>
        {projects.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-zinc-500">
            Нет проектов
          </div>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    project.id === projectId
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                  onClick={() => handleSelect(project.id, project.name)}
                >
                  {project.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
