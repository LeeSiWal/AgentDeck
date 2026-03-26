import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function useProjectLauncher() {
  const navigate = useNavigate();

  const launchProject = useCallback(
    (projectPath: string) => {
      const encoded = encodeURIComponent(projectPath);
      navigate(`/launch/${encoded}`);
    },
    [navigate]
  );

  const launchAgent = useCallback(
    async (preset: string, name: string, workingDir: string, command: string, args: string[]) => {
      const agent = await api.createAgent({ preset, name, workingDir, command, args });
      navigate(`/agents/${agent.id}`);
      return agent;
    },
    [navigate]
  );

  return { launchProject, launchAgent };
}
