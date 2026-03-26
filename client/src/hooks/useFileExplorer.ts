import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { agentDeckWS } from '../lib/ws';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  modTime?: string;
  children?: FileNode[];
}

export function useFileExplorer(agentId: string | null) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const data = await api.fileTree(agentId);
      setTree(data);
    } catch (err) {
      console.error('Failed to fetch file tree:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Watch for file changes
  useEffect(() => {
    if (!agentId) return;

    const unsub = agentDeckWS.on('file:changed', (change: any) => {
      setChangedFiles((prev) => new Set([...prev, change.path]));
      // Auto-refresh tree on create/remove
      if (change.operation === 'create' || change.operation === 'remove') {
        fetchTree();
      }
    });

    return unsub;
  }, [agentId, fetchTree]);

  const openFile = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      try {
        const data = await api.readFile(path, agentId || undefined);
        setFileContent(data.content);
        setChangedFiles((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      } catch (err) {
        console.error('Failed to read file:', err);
        setFileContent(null);
      }
    },
    [agentId]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      await api.writeFile(path, content, agentId || undefined);
      setFileContent(content);
    },
    [agentId]
  );

  const createDir = useCallback(
    async (path: string) => {
      await api.mkdir(path, agentId || undefined);
      fetchTree();
    },
    [agentId, fetchTree]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      await api.deleteFile(path, agentId || undefined);
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent(null);
      }
      fetchTree();
    },
    [agentId, selectedFile, fetchTree]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      await api.renameFile(oldPath, newPath, agentId || undefined);
      if (selectedFile === oldPath) {
        setSelectedFile(newPath);
      }
      fetchTree();
    },
    [agentId, selectedFile, fetchTree]
  );

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return {
    tree,
    loading,
    selectedFile,
    fileContent,
    expandedDirs,
    changedFiles,
    fetchTree,
    openFile,
    saveFile,
    createDir,
    deleteFile,
    renameFile,
    toggleDir,
    setSelectedFile,
  };
}
