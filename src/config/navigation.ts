import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  ShoppingBag,
  PackageCheck,
  Mail,
  FileText,
  BarChart3,
} from 'lucide-react';
import type { NavSection } from '@/types/navigation';

export const navigationSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Contacts', path: '/crm', icon: Users },
      { label: 'Companies', path: '/companies', icon: Building2 },
    ],
  },
  {
    title: 'Sales & Commerce',
    items: [
      { label: 'Pipeline', path: '/pipeline', icon: Target },
      { label: 'Online Store', path: '/store', icon: ShoppingBag },
      { label: 'Orders', path: '/orders', icon: PackageCheck },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Email Marketing', path: '/email-marketing', icon: Mail },
      // { label: 'Reviews', path: '/reviews', icon: Star }, // Hidden until business is accepted on Google Places
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Documents', path: '/documents', icon: FileText },
      { label: 'Reporting', path: '/reporting', icon: BarChart3 },
    ],
  },
];
