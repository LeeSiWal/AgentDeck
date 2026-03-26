import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PinInput } from '../components/auth/PinInput';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] safe-top px-4 bg-deck-bg">
      <h1 className="text-2xl font-bold mb-2">AgentDeck</h1>
      <p className="text-sm text-deck-text-dim mb-8">Enter PIN to continue</p>
      <PinInput onSubmit={login} />
    </div>
  );
}
