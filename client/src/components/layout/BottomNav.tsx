import { Link, useLocation } from 'react-router-dom';
import { IconHome, IconLog, IconSettings } from '../icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', Icon: IconHome },
  { href: '/logs', label: 'Logs', Icon: IconLog },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden flex items-center justify-around safe-bottom bg-deck-surface border-t border-deck-border">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center gap-1 py-3 px-6 text-xs"
            style={{ color: active ? '#6366f1' : '#64748b' }}
          >
            <item.Icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
