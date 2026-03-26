import { useLocation, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { navigationSections } from '@/config/navigation';
import { useTheme } from '@/hooks/useTheme';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();

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
        {navigationSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            <ul className="sidebar-section-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`sidebar-item ${active ? 'active' : ''}`}
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
        ))}
      </nav>

      {/* Footer pinned settings */}
      <div className="sidebar-footer">
        <Link
          to="/settings"
          className={`sidebar-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => {
            if (window.innerWidth <= 768) onClose();
          }}
        >
          <Settings size={18} className="sidebar-item-icon" />
          <span className="sidebar-item-label">Settings</span>
          {isActive('/settings') && <div className="sidebar-item-indicator" />}
        </Link>
      </div>
    </aside>
  );
}
