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
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, permissionKey: 'dashboard' },
      { label: 'Contacts', path: '/crm', icon: Users, permissionKey: 'crm' },
      { label: 'Companies', path: '/companies', icon: Building2, permissionKey: 'companies' },
    ],
  },
  {
    title: 'Sales & Commerce',
    items: [
      { label: 'Pipeline', path: '/pipeline', icon: Target, permissionKey: 'pipeline' },
      { label: 'Online Store', path: '/store', icon: ShoppingBag, permissionKey: 'store' },
      { label: 'Orders', path: '/orders', icon: PackageCheck, permissionKey: 'orders' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Email Marketing', path: '/email-marketing', icon: Mail, permissionKey: 'email_marketing' },
      // { label: 'Reviews', path: '/reviews', icon: Star, permissionKey: 'reviews' }, // Hidden until business is accepted on Google Places
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Documents', path: '/documents', icon: FileText, permissionKey: 'documents' },
      { label: 'Reporting', path: '/reporting', icon: BarChart3, permissionKey: 'reporting' },
    ],
  },
];
