import { useAppStore } from '../../stores/appStore';
import { PixelSprite } from '../animation/PixelSprite';
import { getSpritePreset, type CharacterTheme } from '../animation/sprites/presets';
import { generatePalette } from '../../lib/paletteGenerator';

const THEMES: { id: CharacterTheme; name: string; description: string }[] = [
  { id: 'default', name: 'Default', description: 'Humanoid dot characters' },
  { id: 'cat', name: 'Cat', description: 'Cat dot characters' },
];

const PREVIEW_TYPES = ['read', 'write', 'bash', 'search', 'think'];
const PREVIEW_PALETTE = generatePalette(220);

export function CharacterThemeSettings() {
  const { characterTheme, setCharacterTheme } = useAppStore();

  return (
    <div className="card p-3">
      <div className="text-sm font-medium mb-3">Character Theme</div>
      <div className="space-y-3">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setCharacterTheme(theme.id)}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              characterTheme === theme.id
                ? 'border-deck-accent bg-deck-accent/10'
                : 'border-deck-border bg-deck-bg hover:bg-deck-border/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium">{theme.name}</span>
                <span className="text-xs text-deck-text-dim ml-2">{theme.description}</span>
              </div>
              {characterTheme === theme.id && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-deck-accent text-white">Active</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {PREVIEW_TYPES.map((type) => {
                const preset = getSpritePreset(type, theme.id);
                return (
                  <div key={type} className="flex flex-col items-center gap-1">
                    <PixelSprite
                      preset={preset}
                      palette={PREVIEW_PALETTE}
                      state="idle"
                      size={28}
                    />
                    <span className="text-[9px] text-deck-text-dim">{preset.name}</span>
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
