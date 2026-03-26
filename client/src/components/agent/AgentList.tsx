import { Link } from 'react-router-dom';
import { Agent } from '../../stores/appStore';
import { StatusBadge } from '../layout/StatusBadge';
import { AGENT_ICON_MAP } from '../icons';

interface AgentListProps {
  agents: Agent[];
  onDestroy: (id: string) => void;
}

export function AgentList({ agents, onDestroy }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-deck-text-dim text-sm">
        No agents running
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {agents.map((agent) => {
        const IC = AGENT_ICON_MAP[agent.preset];
        return (
          <Link
            key={agent.id}
            to={`/agents/${agent.id}`}
            className="flex items-center gap-3 p-3 card hover:bg-deck-border/30 transition-colors"
          >
            {IC && <IC size={20} />}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{agent.name}</div>
              <div className="text-xs text-deck-text-dim truncate">{agent.workingDir}</div>
            </div>
            <StatusBadge status={agent.status} />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDestroy(agent.id); }}
              className="text-xs px-2 py-1 rounded bg-deck-danger/20 text-deck-danger"
            >
              Kill
            </button>
          </Link>
        );
      })}
    </div>
  );
}
