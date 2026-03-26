import { useAuth } from '../hooks/useAuth';
import { SoundSettings } from '../components/settings/SoundSettings';
import { BottomNav } from '../components/layout/BottomNav';

export function SettingsPage() {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-[100dvh] safe-top bg-deck-bg">
      <header className="px-4 py-2 bg-deck-surface border-b border-deck-border">
        <span className="text-sm font-medium">Settings</span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
        <SoundSettings />

        <div className="card p-3">
          <div className="text-sm font-medium mb-1">About</div>
          <div className="text-xs text-deck-text-dim">
            AgentDeck Go - AI Agent Terminal Manager
          </div>
          <div className="text-xs text-deck-text-dim mt-1">
            Single binary, zero dependencies
          </div>
        </div>

        <button onClick={logout} className="btn-danger w-full">
          Logout
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
