import { Agent } from '../../stores/appStore';
import { AgentCard } from './AgentCard';

interface AgentGridProps {
  agents: Agent[];
  onDestroy: (id: string) => void;
}

export function AgentGrid({ agents, onDestroy }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-deck-text-dim text-sm">
        No agents running
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onDestroy={onDestroy} />
      ))}
    </div>
  );
}
