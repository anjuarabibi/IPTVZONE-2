import { ActiveTab } from '../types';
import { Home, Tv, Film, Settings, MonitorPlay } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  title: string;
}

export default function Header({ activeTab, onTabChange, title }: HeaderProps) {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'live' as ActiveTab, label: 'Live TV', icon: Tv },
    { id: 'video' as ActiveTab, label: 'Video Player', icon: Film },
    { id: 'admin' as ActiveTab, label: 'Admin Panel', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 md:px-8 py-3 flex items-center justify-between">
      {/* Brand logo on left */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
        onClick={() => onTabChange('home')}
      >
        <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
          <MonitorPlay size={18} fill="currentColor" />
        </div>
        <span className="font-sans font-black tracking-tight text-white text-lg">
          IPTV<span className="text-rose-500 font-extrabold">Zone</span>
        </span>
      </div>

      {/* Nav Actions on right */}
      <nav className="flex items-center gap-1.5 md:gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex items-center justify-center p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/35'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/80'
              }`}
              title={item.label}
              id={`nav-tab-${item.id}`}
            >
              <Icon size={18} />
              <span className="hidden md:inline font-sans text-xs font-semibold ml-2 pr-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
