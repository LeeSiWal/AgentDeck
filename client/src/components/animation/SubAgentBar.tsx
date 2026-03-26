import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { PixelSprite } from './PixelSprite';
import { getSpritePreset, type CharacterTheme } from './sprites/presets';
import { generatePalette } from '../../lib/paletteGenerator';

interface SubAgentBarProps {
  agentId: string;
}

export function SubAgentBar({ agentId }: SubAgentBarProps) {
  const { subAgents, agents, characterTheme } = useAppStore();
  const subs = subAgents.get(agentId) || [];
  const agent = agents.find(a => a.id === agentId);
  const palette = generatePalette(agent?.colorHue ?? 220);
  const theme = characterTheme as CharacterTheme;

  // Periodic re-render to drive fade-out animation for completed sub-agents
  const [, setTick] = useState(0);
  const hasFading = subs.some(s =>
    (s.status === 'completed' || s.status === 'error') && s.completedAt && (Date.now() - s.completedAt) < 15000
  );
  useEffect(() => {
    if (!hasFading) return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [hasFading]);

  if (subs.length === 0) return null;

  const activeSubs = subs.filter(s => s.status === 'running');

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto scrollbar-hide border-b border-deck-border/50">
      {subs.slice().reverse().slice(0, 8).map((sub) => {
        const preset = getSpritePreset(sub.type, theme);
        const isActive = sub.status === 'running';
        const isCompleted = sub.status === 'completed' || sub.status === 'error';

        // Calculate fade-out opacity for completed agents
        let fadeOpacity = 1;
        if (isCompleted && sub.completedAt) {
          const elapsed = Date.now() - sub.completedAt;
          // Start fading after 5s, fully gone at 15s
          fadeOpacity = Math.max(0, 1 - Math.max(0, elapsed - 5000) / 10000);
        }

        if (fadeOpacity <= 0) return null;

        return (
          <div
            key={sub.id}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all duration-500"
            style={{ opacity: isActive ? 1 : fadeOpacity * 0.5 }}
            title={`${sub.name} (${sub.status})`}
          >
            <PixelSprite
              preset={preset}
              palette={palette}
              state={isActive ? 'active' : 'idle'}
              size={20}
              glow={isActive}
              glowColor={palette[2]}
            />
            <span
              className="text-[10px] font-medium transition-colors"
              style={{ color: isActive ? palette[2] : palette[1] }}
            >
              {preset.name}
            </span>
          </div>
        );
      })}
      {activeSubs.length > 0 && (
        <span className="text-[10px] text-deck-text-dim ml-auto whitespace-nowrap">
          {activeSubs.length} active
        </span>
      )}
    </div>
  );
}
