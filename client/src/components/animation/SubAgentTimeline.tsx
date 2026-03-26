import { SubAgent } from '../../stores/appStore';
import { PixelSprite } from './PixelSprite';
import { getSpritePreset, type CharacterTheme } from './sprites/presets';
import { useAppStore } from '../../stores/appStore';

interface SubAgentTimelineProps {
  subAgents: SubAgent[];
  palette: string[];
}

export function SubAgentTimeline({ subAgents, palette }: SubAgentTimelineProps) {
  const { characterTheme } = useAppStore();
  const theme = characterTheme as CharacterTheme;

  if (subAgents.length === 0) {
    return <div className="text-xs text-deck-text-dim text-center py-4">No sub-agent activity yet</div>;
  }

  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-deck-text-dim mb-2">Activity</h4>
      {subAgents.slice().reverse().map((sub) => {
        const preset = getSpritePreset(sub.type, theme);
        const isActive = sub.status === 'running';
        const duration = sub.completedAt ? `${((sub.completedAt - sub.startedAt) / 1000).toFixed(1)}s` : null;

        return (
          <div key={sub.id} className="flex items-center gap-2 py-1">
            <PixelSprite preset={preset} palette={palette} state={isActive ? 'active' : 'idle'} size={16} />
            <span className="text-xs flex-1 truncate" style={{ color: isActive ? palette[2] : palette[1] }}>
              {sub.name}
            </span>
            <span className="text-[10px] text-deck-text-dim">
              {sub.status === 'running' ? 'running' : sub.status === 'error' ? 'error' : duration || 'done'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
