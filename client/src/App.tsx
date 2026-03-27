import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { useWebSocket } from './hooks/useWebSocket';

import { LoginPage } from './pages/LoginPage';
import { ProjectSelectPage } from './pages/ProjectSelectPage';
import { AgentLauncherPage } from './pages/AgentLauncherPage';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalPage } from './pages/TerminalPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CommandPalette } from './components/CommandPalette';

function AuthGuard() {
  const { isAuthenticated } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}

export default function App() {
  // Force real reflow after mount — fixes frozen flex/overflow layout on refresh.
  // Reading offsetHeight forces the browser to synchronously recalculate layout.
  useEffect(() => {
    const forceReflow = () => {
      void document.getElementById('root')!.offsetHeight;
      window.dispatchEvent(new Event('resize'));
    };
    // Triple-tap: immediate + after paint + after settle
    forceReflow();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => forceReflow());
    });
    const t = setTimeout(forceReflow, 300);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  // Mobile keyboard: override height only when virtual keyboard shrinks the viewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      // Only override when keyboard is actually visible (viewport significantly smaller)
      if (vv.height < window.innerHeight * 0.85) {
        document.documentElement.style.setProperty('--kb-height', `${vv.height}px`);
        document.getElementById('root')!.style.height = `${vv.height}px`;
      } else {
        document.documentElement.style.removeProperty('--kb-height');
        document.getElementById('root')!.style.height = '';
      }
    };

    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return (
    <BrowserRouter>
      <WebSocketProvider>
        <CommandPalette />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AuthGuard />}>
            <Route path="/" element={<ProjectSelectPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/launch/:encodedPath" element={<AgentLauncherPage />} />
            <Route path="/agents/:id" element={<TerminalPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </WebSocketProvider>
    </BrowserRouter>
  );
}
