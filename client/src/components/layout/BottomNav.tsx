import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconLog, IconSettings, IconPlus } from '../icons';
import { NotificationBadge } from '../notification/NotificationBadge';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', Icon: IconHome },
  { href: '/logs', label: 'Logs', Icon: IconLog },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden flex items-center justify-around safe-bottom bg-deck-surface border-t border-deck-border">
      {NAV_ITEMS.map((item, i) => {
        const active = pathname === item.href;

        // Insert + button in the middle (after first item)
        const elements = [];
        if (i === 1) {
          elements.push(
            <button
              key="new-agent"
              onClick={() => navigate('/?new=1')}
              className="flex flex-col items-center gap-1 py-2 px-5"
            >
              <div className="w-10 h-10 rounded-full bg-deck-accent flex items-center justify-center shadow-lg">
                <IconPlus size={20} color="#fff" />
              </div>
            </button>
          );
        }

        elements.push(
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center gap-1 py-3 px-5 text-xs min-w-[56px]"
            style={{ color: active ? '#6366f1' : '#64748b' }}
          >
            <div className="relative">
              <item.Icon size={22} />
              {item.href === '/dashboard' && (
                <NotificationBadge className="absolute -top-1.5 -right-2.5" />
              )}
            </div>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );

        return elements;
      })}
    </nav>
  );
}
