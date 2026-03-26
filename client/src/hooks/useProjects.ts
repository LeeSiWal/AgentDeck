import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

interface RecentProject {
  id: number;
  path: string;
  name: string;
  lastOpenedAt: string;
  lastAgentPreset?: string;
  openCount: number;
}

interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export function useProjects() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [browseEntries, setBrowseEntries] = useState<DirEntry[]>([]);
  const [browsePath, setBrowsePath] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchRecent = useCallback(async () => {
    try {
      const data = await api.recentProjects();
      setRecentProjects(data);
    } catch (err) {
      console.error('Failed to fetch recent projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const browse = useCallback(async (path?: string) => {
    setLoading(true);
    try {
      const data = await api.browseDir(path);
      setBrowseEntries(data.entries);
      setBrowsePath(data.path || path || '');
    } catch (err) {
      console.error('Failed to browse:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeRecent = useCallback(
    async (id: number) => {
      await api.deleteRecentProject(id);
      fetchRecent();
    },
    [fetchRecent]
  );

  const searchProjects = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    return api.searchProjects(query);
  }, []);

  const createProject = useCallback(
    async (parentDir: string, name: string) => {
      const result = await api.createProject(parentDir, name);
      fetchRecent();
      return result;
    },
    [fetchRecent]
  );

  const deleteProject = useCallback(
    async (path: string) => {
      await api.deleteProject(path);
      fetchRecent();
    },
    [fetchRecent]
  );

  const renameProject = useCallback(
    async (oldPath: string, newName: string) => {
      const result = await api.renameProject(oldPath, newName);
      fetchRecent();
      return result;
    },
    [fetchRecent]
  );

  return {
    recentProjects,
    browseEntries,
    browsePath,
    loading,
    fetchRecent,
    browse,
    removeRecent,
    searchProjects,
    createProject,
    deleteProject,
    renameProject,
  };
}
