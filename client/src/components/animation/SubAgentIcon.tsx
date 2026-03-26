import { SUB_AGENT_ICON_MAP } from '../icons';

const TYPE_COLORS: Record<string, string> = {
  read: '#3B82F6', write: '#F59E0B', bash: '#10B981', search: '#8B5CF6',
  think: '#EC4899', unknown: '#6B7280',
};

interface SubAgentIconProps {
  type: string;
  isActive?: boolean;
  size?: number;
}

export function SubAgentIcon({ type, isActive = false, size = 16 }: SubAgentIconProps) {
  const IC = SUB_AGENT_ICON_MAP[type] || SUB_AGENT_ICON_MAP.unknown;
  const color = TYPE_COLORS[type] || TYPE_COLORS.unknown;

  return (
    <span className={`inline-flex items-center justify-center transition-all ${isActive ? 'animate-glow-pulse' : 'opacity-30'}`}>
      <IC size={size} color={isActive ? color : '#475569'} />
    </span>
  );
}
