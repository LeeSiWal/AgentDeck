import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';
import { useDevice } from '../hooks/useDevice';
import { AgentGrid } from '../components/agent/AgentGrid';
import { AgentList } from '../components/agent/AgentList';
import { CreateAgentSheet } from '../components/agent/CreateAgentSheet';
import { BottomNav } from '../components/layout/BottomNav';
import { IconPlus } from '../components/icons';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { agents, createAgent, deleteAgent } = useAgents();
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const runningAgents = agents.filter(a => a.status === 'running');

  const handleCreate = async (data: { preset: string; name: string; workingDir: string; command?: string; args?: string[] }) => {
    try {
      const PRESET_COMMANDS: Record<string, { command: string; args: string[] }> = {
        'claude-code': { command: 'claude', args: [] },
        'gemini-cli': { command: 'gemini', args: [] },
        'codex-cli': { command: 'codex', args: [] },
      };
      const presetConfig = PRESET_COMMANDS[data.preset];
      const command = data.command || presetConfig?.command || data.preset;
      const args = [...(data.args || []), ...(presetConfig?.args || [])];

      const agent = await createAgent({
        preset: data.preset,
        name: data.name,
        workingDir: data.workingDir,
        command,
        args,
      });
      if (agent?.id) {
        navigate(`/agents/${agent.id}`);
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] safe-top bg-deck-bg">
      <header className="flex items-center justify-between px-4 py-2.5 bg-deck-surface border-b border-deck-border shrink-0">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-2 -ml-1 rounded-lg active:bg-deck-border/30 hover:bg-deck-border/30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L2 8l4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-xs text-deck-text-dim">Projects</span>
          </Link>
          <span className="text-sm font-medium">Dashboard</span>
          <span className="text-xs text-deck-text-dim">
            {runningAgents.length} running
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-deck-accent/10 text-deck-accent active:bg-deck-accent/20 hover:bg-deck-accent/20"
          title="New Agent"
        >
          <IconPlus size={14} />
          <span className="text-xs font-medium">New</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isMobile ? (
          <AgentList agents={agents} onDestroy={deleteAgent} />
        ) : (
          <AgentGrid agents={agents} onDestroy={deleteAgent} />
        )}
      </main>

      <BottomNav />

      <CreateAgentSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
