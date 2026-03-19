import { PageShell } from '@/components/layout/PageShell';
import {
  Users,
  ShoppingBag,
  Target,
  Mail,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import './DashboardPage.css';

const stats = [
  {
    label: 'Total Contacts',
    value: '2,847',
    change: '+12.5%',
    trend: 'up' as const,
    icon: Users,
    gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
  },
  {
    label: 'Pipeline Value',
    value: '£284,500',
    change: '+8.2%',
    trend: 'up' as const,
    icon: Target,
    gradient: 'linear-gradient(135deg, #111111, #333333)',
  },
  {
    label: 'Store Orders',
    value: '156',
    change: '-3.1%',
    trend: 'down' as const,
    icon: ShoppingBag,
    gradient: 'linear-gradient(135deg, #991b1b, #dc2626)',
  },
  {
    label: 'Email Sent',
    value: '12,480',
    change: '+24.8%',
    trend: 'up' as const,
    icon: Mail,
    gradient: 'linear-gradient(135deg, #1a1a1a, #444444)',
  },
];

export function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      subtitle="Welcome back. Here's what's happening across your business."
    >
      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-card-header">
                <div
                  className="stat-card-icon"
                  style={{ background: stat.gradient }}
                >
                  <Icon size={18} />
                </div>
                <div
                  className={`stat-card-change ${
                    stat.trend === 'up' ? 'positive' : 'negative'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="stat-card-value">{stat.value}</div>
              <div className="stat-card-label">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Placeholder panels */}
      <div className="dashboard-grid">
        <div className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <h3>Revenue Overview</h3>
            <TrendingUp size={18} className="text-secondary" />
          </div>
          <div className="dashboard-panel-placeholder">
            Chart will be rendered here using Recharts
          </div>
        </div>
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="dashboard-panel-placeholder">
            Activity feed will appear here
          </div>
        </div>
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Pipeline Summary</h3>
          </div>
          <div className="dashboard-panel-placeholder">
            Pipeline stages breakdown will appear here
          </div>
        </div>
        <div className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <h3>Upcoming Installations</h3>
          </div>
          <div className="dashboard-panel-placeholder">
            Installation schedule will appear here
          </div>
        </div>
      </div>
    </PageShell>
  );
}
