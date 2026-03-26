import { useEffect, useRef } from 'react';
import { agentDeckWS } from '../lib/ws';
import { api } from '../lib/api';
import { useAppStore } from '../stores/appStore';

export function useWebSocket() {
  const connected = useRef(false);
  const { setAgents, addAgent, removeAgent, updateAgentStatus, isAuthenticated } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = api.getToken();
    if (!token || connected.current) return;

    agentDeckWS.connect(token);
    connected.current = true;

    const unsubs = [
      agentDeckWS.on('agent:list', (agents) => setAgents(agents)),
      agentDeckWS.on('agent:created', (agent) => addAgent(agent)),
      agentDeckWS.on('agent:destroyed', ({ agentId }) => removeAgent(agentId)),
      agentDeckWS.on('agent:status', ({ agentId, status }) => updateAgentStatus(agentId, status)),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      agentDeckWS.disconnect();
      connected.current = false;
    };
  }, [isAuthenticated]);

  return { ws: agentDeckWS };
}
