import { Menu, PanelLeftClose, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { GlobalSearch } from './GlobalSearch';
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

      <div className="top-header-center">
        <GlobalSearch />
      </div>

      <div className="top-header-right">
        <button
          className="top-header-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="top-header-avatar">
          <span>IL</span>
        </div>
      </div>
    </header>
  );
}
