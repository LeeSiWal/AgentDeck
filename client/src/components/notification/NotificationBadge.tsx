import { useAppStore } from '../../stores/appStore';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const count = useAppStore((s) => {
    let c = 0;
    s.notifications.forEach((notifs) => { c += notifs.length; });
    return c;
  });

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
