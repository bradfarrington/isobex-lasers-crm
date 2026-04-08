import { useLocation, Link } from 'react-router-dom';
import { Settings, BookOpen, HelpCircle } from 'lucide-react';
import { navigationSections } from '@/config/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import type { AppUserPermissions } from '@/types/database';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onHelpTourClick?: () => void;
}

export function Sidebar({ isOpen, onClose, onHelpTourClick }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const logoSrc =
    theme === 'dark'
      ? '/white logo - no bg.png'
      : '/LOGO - NO HIGH RES.png';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src={logoSrc}
          alt="Isobex Industrial Lasers"
          className="sidebar-logo-img"
        />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigationSections.map((section) => {
          // Filter items based on user permissions
          const visibleItems = section.items.filter((item) => {
            if (!item.permissionKey) return true;
            return hasPermission(item.permissionKey as keyof AppUserPermissions);
          });

          // Don't render section if no visible items
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              <ul className="sidebar-section-items">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`sidebar-item ${active ? 'active' : ''}`}
                        data-tour-target={item.path}
                        onClick={() => {
                          // Close sidebar on mobile when navigating
                          if (window.innerWidth <= 768) onClose();
                        }}
                      >
                        <Icon size={18} className="sidebar-item-icon" />
                        <span className="sidebar-item-label">{item.label}</span>
                        {active && <div className="sidebar-item-indicator" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer pinned settings */}
      <div className="sidebar-footer">
        <Link
          to="/help"
          className={`sidebar-item ${isActive('/help') ? 'active' : ''}`}
          onClick={() => {
            if (window.innerWidth <= 768) onClose();
          }}
        >
          <BookOpen size={18} className="sidebar-item-icon" />
          <span className="sidebar-item-label">Knowledge Hub</span>
          {isActive('/help') && <div className="sidebar-item-indicator" />}
        </Link>
        <Link
          to="/settings"
          data-tour-target="/settings"
          className={`sidebar-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => {
            if (window.innerWidth <= 768) onClose();
          }}
        >
          <Settings size={18} className="sidebar-item-icon" />
          <span className="sidebar-item-label">Settings</span>
          {isActive('/settings') && <div className="sidebar-item-indicator" />}
        </Link>
        {onHelpTourClick && (
          <button
            className="sidebar-item"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            onClick={onHelpTourClick}
          >
            <HelpCircle size={18} className="sidebar-item-icon" />
            <span className="sidebar-item-label">Help & Tutorial</span>
          </button>
        )}
      </div>
    </aside>
  );
}
