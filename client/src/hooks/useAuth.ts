import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { agentDeckWS } from '../lib/ws';
import { useAppStore } from '../stores/appStore';

export function useAuth() {
  const { isAuthenticated, setAuthenticated } = useAppStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (pin: string) => {
      await api.login(pin);
      setAuthenticated(true);
      navigate('/');
    },
    [navigate, setAuthenticated]
  );

  const logout = useCallback(() => {
    api.clearTokens();
    agentDeckWS.disconnect();
    setAuthenticated(false);
    navigate('/login');
  }, [navigate, setAuthenticated]);

  return { isAuthenticated, login, logout };
}
