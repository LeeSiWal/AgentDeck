import { useEffect, useRef } from 'react';
import { SubAgent, useAppStore } from '../stores/appStore';
import { playSubAgentSpawn, playSubAgentComplete, playSubAgentError } from '../lib/subAgentSounds';

export function useSubAgentSound(agentId: string | null) {
  const { subAgents, soundEnabled } = useAppStore();
  const prevCountRef = useRef(0);
  const subs = agentId ? subAgents.get(agentId) || [] : [];

  useEffect(() => {
    if (!soundEnabled || !agentId) return;

    const runningCount = subs.filter((s) => s.status === 'running').length;

    if (runningCount > prevCountRef.current) {
      playSubAgentSpawn();
    }

    prevCountRef.current = runningCount;
  }, [subs, soundEnabled, agentId]);
}
