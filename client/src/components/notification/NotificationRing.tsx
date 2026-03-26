import { useAppStore } from '../../stores/appStore';

interface NotificationRingProps {
  agentId: string;
  children: React.ReactNode;
  className?: string;
}

export function NotificationRing({ agentId, children, className = '' }: NotificationRingProps) {
  const notifications = useAppStore((s) => s.notifications.get(agentId));
  const latest = notifications?.[notifications.length - 1];

  let ringClass = '';
  if (latest) {
    switch (latest.reason) {
      case 'permission_request': ringClass = 'notification-ring-permission'; break;
      case 'waiting_input': ringClass = 'notification-ring-waiting'; break;
      case 'error': ringClass = 'notification-ring-error'; break;
      case 'task_complete': ringClass = 'notification-ring-complete'; break;
    }
  }

  return (
    <div className={`rounded-xl ${ringClass} ${className}`}>
      {children}
      {latest && (
        <div className="px-3 py-1.5 border-t border-deck-border text-xs truncate" style={{
          color: latest.reason === 'error' ? '#ef4444'
            : latest.reason === 'permission_request' ? '#f59e0b'
            : latest.reason === 'task_complete' ? '#10b981'
            : '#3b82f6',
        }}>
          {latest.reason === 'permission_request' ? '\uD83D\uDCAC ' : latest.reason === 'error' ? '\u274C ' : ''}
          {latest.message}
        </div>
      )}
    </div>
  );
}
