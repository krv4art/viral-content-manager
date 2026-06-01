"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Sentinel stored in cookie/state when the user explicitly chooses "all projects".
// Consumers still receive `projectId: null` so list queries stay unfiltered
// (the same behaviour as having no project selected).
export const ALL_PROJECTS_ID = "__all__";

type ProjectContextType = {
  projectId: string | null;
  projectName: string | null;
  isAllProjects: boolean;
  setProject: (id: string, name: string) => void;
  selectAllProjects: () => void;
};

const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  projectName: null,
  isAllProjects: false,
  setProject: () => {},
  selectAllProjects: () => {},
});

export const useCurrentProject = () => useContext(ProjectContext);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    // Read from cookie on mount
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("currentProject="));
    if (cookie) {
      try {
        const value = JSON.parse(
          decodeURIComponent(cookie.split("=")[1])
        );
        setProjectState(value);
      } catch {
        // Invalid cookie, ignore
      }
    }
  }, []);

  const persist = (value: { id: string; name: string }) => {
    setProjectState(value);
    document.cookie = `currentProject=${encodeURIComponent(
      JSON.stringify(value)
    )}; path=/; max-age=${60 * 60 * 24 * 30}`;
  };

  const setProject = (id: string, name: string) => persist({ id, name });

  const selectAllProjects = () =>
    persist({ id: ALL_PROJECTS_ID, name: "Все проекты" });

  const isAllProjects = project?.id === ALL_PROJECTS_ID;

  return (
    <ProjectContext.Provider
      value={{
        // "All projects" exposes a null id so every list query returns
        // everything (incl. articles with no project attached).
        projectId: isAllProjects ? null : project?.id ?? null,
        projectName: project?.name ?? null,
        isAllProjects,
        setProject,
        selectAllProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
