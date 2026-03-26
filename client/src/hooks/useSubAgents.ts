import { useEffect, useRef } from 'react';
import { useAppStore, SubAgent } from '../stores/appStore';
import { agentDeckWS } from '../lib/ws';
import { playToolSound, playSubAgentComplete } from '../lib/subAgentSounds';

const TOOL_TYPE_PATTERNS: [RegExp, string, string][] = [
  [/Read\b|Reading\b|cat\s/im, 'Read', 'read'],
  [/Write\b|Writing\b|Edit\b|Editing\b/im, 'Write', 'write'],
  [/Bash\b|Running\b|\$\s|Executing\b/im, 'Bash', 'bash'],
  [/Search\b|Grep\b|Glob\b|Find\b/im, 'Search', 'search'],
  [/Think|Planning|<antthinking>/im, 'Think', 'think'],
  [/Agent\b|subagent/im, 'Agent', 'linker'],
  [/WebFetch|WebSearch|curl\s|fetch\b/im, 'Web', 'web'],
  [/Diff\b|diff\s|patch/im, 'Diff', 'diff'],
];

const CLEANUP_INTERVAL = 5000;
const CLEANUP_MAX_AGE = 15000;
const AUTO_COMPLETE_MS = 8000;

export function useSubAgents(agentId: string | null) {
  const bufferRef = useRef('');
  const counterRef = useRef(0);
  const activeToolRef = useRef<string | null>(null);
  const debounceMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Use getState() to always read fresh data instead of stale closures
  const getStore = useAppStore.getState;

  const currentSubAgents = agentId ? useAppStore((s) => s.subAgents.get(agentId)) || [] : [];

  useEffect(() => {
    if (!agentId) return;

    const processOutput = (data: string) => {
      bufferRef.current += data;

      const lines = bufferRef.current.split('\n');
      bufferRef.current = lines.pop() || '';

      const { addSubAgent, updateSubAgent, soundEnabled, subAgents } = getStore();
      const shouldSound = soundEnabled;
      const currentSubs = subAgents.get(agentId) || [];

      for (const line of lines) {
        const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
        if (!cleanLine || cleanLine.length < 2) continue;

        for (const [pattern, name, type] of TOOL_TYPE_PATTERNS) {
          if (pattern.test(cleanLine)) {
            if (activeToolRef.current === type) break;

            // Complete previous active tool
            if (activeToolRef.current) {
              const prev = currentSubs.find(
                (s) => s.type === activeToolRef.current && s.status === 'running'
              );
              if (prev) {
                updateSubAgent(agentId, prev.id, { status: 'completed', completedAt: Date.now() });
                if (shouldSound) playSubAgentComplete();
              }
            }

            activeToolRef.current = type;
            const sub: SubAgent = {
              id: `${agentId}-sub-${++counterRef.current}`,
              name,
              type,
              status: 'running',
              startedAt: Date.now(),
            };
            addSubAgent(agentId, sub);
            if (shouldSound) playToolSound(type);

            // Auto-complete after timeout (per tool type)
            const prevTimer = debounceMapRef.current.get(type);
            if (prevTimer) clearTimeout(prevTimer);
            debounceMapRef.current.set(type, setTimeout(() => {
              const { subAgents: latestSubs, updateSubAgent: update } = getStore();
              const running = (latestSubs.get(agentId) || []).find(
                (s) => s.type === type && s.status === 'running'
              );
              if (running) {
                update(agentId, running.id, { status: 'completed', completedAt: Date.now() });
              }
              if (activeToolRef.current === type) activeToolRef.current = null;
              debounceMapRef.current.delete(type);
            }, AUTO_COMPLETE_MS));

            break;
          }
        }
      }
    };

    const unsub = agentDeckWS.on('terminal:output', (payload: any) => {
      if (payload.agentId === agentId) {
        processOutput(payload.data);
      }
    });

    const cleanupTimer = setInterval(() => {
      getStore().cleanupSubAgents(agentId, CLEANUP_MAX_AGE);
    }, CLEANUP_INTERVAL);

    return () => {
      unsub();
      clearInterval(cleanupTimer);
      debounceMapRef.current.forEach(t => clearTimeout(t));
      debounceMapRef.current.clear();
    };
  }, [agentId]);

  return { subAgents: currentSubAgents };
}
