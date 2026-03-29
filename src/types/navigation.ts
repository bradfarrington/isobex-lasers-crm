import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission key used to gate visibility for staff users */
  permissionKey?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
