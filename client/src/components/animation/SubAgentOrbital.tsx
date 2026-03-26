import { SubAgent } from '../../stores/appStore';
import { PixelSprite } from './PixelSprite';
import { getSpritePreset, type CharacterTheme } from './sprites/presets';
import { useAppStore } from '../../stores/appStore';

const AGENT_TYPES = ['read', 'write', 'bash', 'search', 'think', 'web', 'diff', 'mcp'];

interface SubAgentOrbitalProps {
  subAgents: SubAgent[];
  palette: string[];
  size?: 'sm' | 'md' | 'lg';
}

export function SubAgentOrbital({ subAgents, palette, size = 'md' }: SubAgentOrbitalProps) {
  const dims = { sm: 160, md: 220, lg: 280 };
  const dim = dims[size];
  const center = dim / 2;
  const radius = dim * 0.36;
  const mainR = dim * 0.12;
  const spriteSize = size === 'sm' ? 24 : 32;
  const { characterTheme } = useAppStore();
  const theme = characterTheme as CharacterTheme;

  const activeTypes = new Set(subAgents.filter(s => s.status === 'running').map(s => s.type));

  return (
    <div style={{ width: dim, height: dim, position: 'relative' }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="absolute inset-0 select-none">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <circle cx={center} cy={center} r={mainR} fill="#1e293b" stroke={palette[2]} strokeWidth="1.5" opacity="0.8" />
      </svg>

      {AGENT_TYPES.map((type, i) => {
        const angle = (i / AGENT_TYPES.length) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const preset = getSpritePreset(type, theme);
        const isActive = activeTypes.has(type);

        return (
          <div
            key={type}
            className="absolute flex flex-col items-center transition-all duration-300"
            style={{
              left: x - spriteSize / 2,
              top: y - spriteSize / 2,
              opacity: isActive ? 1 : 0.25,
            }}
          >
            <PixelSprite
              preset={preset}
              palette={palette}
              state={isActive ? 'active' : 'idle'}
              size={spriteSize}
              glow={isActive}
              glowColor={palette[2]}
            />
            <span
              className="text-[8px] mt-0.5 font-medium"
              style={{ color: isActive ? palette[2] : '#475569' }}
            >
              {preset.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
