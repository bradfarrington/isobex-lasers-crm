import { Menu, PanelLeftClose, Search, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import './TopHeader.css';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function TopHeader({ onToggleSidebar, sidebarOpen }: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="top-header-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className="top-header-right">
        <button
          className="top-header-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="top-header-icon-btn" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="top-header-icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="top-header-avatar">
          <span>IL</span>
        </div>
      </div>
    </header>
  );
}
