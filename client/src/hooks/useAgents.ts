import { useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../stores/appStore';

export function useAgents() {
  const { agents, setAgents } = useAppStore();

  const fetchAgents = useCallback(async () => {
    try {
      const data = await api.listAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  }, [setAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = useCallback(async (data: any) => {
    return api.createAgent(data);
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    await api.deleteAgent(id);
  }, []);

  const restartAgent = useCallback(async (id: string) => {
    return api.restartAgent(id);
  }, []);

  return { agents, fetchAgents, createAgent, deleteAgent, restartAgent };
}
