import { Menu, PanelLeftClose, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/ui/AlertDialog';
import { GlobalSearch } from './GlobalSearch';
import './TopHeader.css';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function TopHeader({ onToggleSidebar, sidebarOpen }: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { showConfirm } = useAlert();

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
    });

    if (confirmed) {
      await supabase.auth.signOut();
    }
  };

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
        <button 
          className="top-header-avatar"
          onClick={handleLogout}
          title="Sign out"
          style={{ cursor: 'pointer', border: 'none', padding: 0 }}
        >
          <span>IL</span>
        </button>
      </div>
    </header>
  );
}
