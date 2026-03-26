import { Link } from 'react-router-dom';
import { Agent } from '../../stores/appStore';
import { StatusBadge } from '../layout/StatusBadge';
import { SubAgentBar } from '../animation/SubAgentBar';
import { TerminalView } from '../terminal/TerminalView';
import { AGENT_ICON_MAP } from '../icons';

interface AgentCardProps {
  agent: Agent;
  onDestroy: (id: string) => void;
}

export function AgentCard({ agent, onDestroy }: AgentCardProps) {
  const IC = AGENT_ICON_MAP[agent.preset];

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-deck-border">
        <div className="flex items-center gap-2">
          {IC && <IC size={18} />}
          <span className="font-medium text-sm text-deck-text">{agent.name}</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to={`/agents/${agent.id}`}
            className="text-xs px-2 py-0.5 rounded bg-deck-bg text-deck-text hover:bg-deck-border"
          >
            Open
          </Link>
          <button
            onClick={() => onDestroy(agent.id)}
            className="text-xs px-2 py-0.5 rounded bg-deck-danger/20 text-deck-danger hover:bg-deck-danger/30"
          >
            Kill
          </button>
        </div>
      </div>

      <SubAgentBar agentId={agent.id} />

      <div className="flex-1 min-h-[200px]">
        <TerminalView agentId={agent.id} fontSize={11} />
      </div>
    </div>
  );
}
