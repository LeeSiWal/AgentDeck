import { useAppStore } from '../../stores/appStore';

export function SoundSettings() {
  const { soundEnabled, setSoundEnabled } = useAppStore();

  return (
    <div className="flex items-center justify-between p-3 card">
      <div>
        <div className="text-sm font-medium">Sound Effects</div>
        <div className="text-xs text-deck-text-dim">Play sounds for sub-agent activity</div>
      </div>
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          soundEnabled ? 'bg-deck-accent' : 'bg-deck-border'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            soundEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
