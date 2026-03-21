import { useLocation, Link } from 'react-router-dom';
import {
  Package,
  FolderOpen,
  BarChart3,
  Gift,
  Percent,
  Paintbrush,
  LayoutTemplate,
} from 'lucide-react';

const storeTabs = [
  { label: 'Products', path: '/store', icon: Package },
  { label: 'Collections', path: '/store/collections', icon: FolderOpen },
  { label: 'Inventory', path: '/store/inventory', icon: BarChart3 },
  { label: 'Gift Cards', path: '/store/gift-cards', icon: Gift },
  { label: 'Discounts', path: '/store/discounts', icon: Percent },
  { label: 'Pages', path: '/store/pages', icon: LayoutTemplate },
  { label: 'Builder', path: '/store/builder', icon: Paintbrush },
];

export function StoreTabBar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/store') return location.pathname === '/store';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="store-tab-bar">
      {storeTabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.path);
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`store-tab ${active ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
