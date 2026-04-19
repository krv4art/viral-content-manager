"use client";

import { createContext, useContext, useState, useEffect } from "react";

type ProjectContextType = {
  projectId: string | null;
  projectName: string | null;
  setProject: (id: string, name: string) => void;
};

const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  projectName: null,
  setProject: () => {},
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

  const setProject = (id: string, name: string) => {
    setProjectState({ id, name });
    document.cookie = `currentProject=${encodeURIComponent(
      JSON.stringify({ id, name })
    )}; path=/; max-age=${60 * 60 * 24 * 30}`;
  };

  return (
    <ProjectContext.Provider
      value={{
        projectId: project?.id ?? null,
        projectName: project?.name ?? null,
        setProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
