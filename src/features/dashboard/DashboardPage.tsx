import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import {
  Users,
  Building2,
  UserCheck,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const { state } = useData();
  const { dashboardStats } = state;

  const stats = [
    {
      label: 'Total Contacts',
      value: dashboardStats.totalContacts.toLocaleString(),
      icon: Users,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
    },
    {
      label: 'Customers',
      value: dashboardStats.totalCustomers.toLocaleString(),
      icon: UserCheck,
      gradient: 'linear-gradient(135deg, #111111, #333333)',
    },
    {
      label: 'Leads',
      value: dashboardStats.totalLeads.toLocaleString(),
      icon: UserPlus,
      gradient: 'linear-gradient(135deg, #991b1b, #dc2626)',
    },
    {
      label: 'Companies',
      value: dashboardStats.totalCompanies.toLocaleString(),
      icon: Building2,
      gradient: 'linear-gradient(135deg, #1a1a1a, #444444)',
    },
  ];

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
            <h3>Recent Leads</h3>
          </div>
          {state.contacts.filter((c) => c.contact_type === 'Lead').length === 0 ? (
            <div className="dashboard-panel-placeholder">
              No leads yet — enquiries will appear here
            </div>
          ) : (
            <div className="dashboard-recent-list">
              {state.contacts
                .filter((c) => c.contact_type === 'Lead')
                .slice(0, 5)
                .map((lead) => (
                  <Link key={lead.id} to={`/crm/${lead.id}`} className="dashboard-recent-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div className="name-primary">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="name-secondary">{lead.email}</div>
                    </div>
                    {lead.status && (
                      <span className="status-badge">{lead.status}</span>
                    )}
                  </Link>
                ))}
            </div>
          )}
        </div>
        <div className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <h3>Recent Contacts</h3>
          </div>
          {state.contacts.length === 0 ? (
            <div className="dashboard-panel-placeholder">
              No contacts yet — add your first contact to get started
            </div>
          ) : (
            <div className="dashboard-recent-list">
              {state.contacts.slice(0, 5).map((contact) => (
                <Link key={contact.id} to={`/crm/${contact.id}`} className="dashboard-recent-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <div className="name-primary">
                      {contact.first_name} {contact.last_name}
                    </div>
                    <div className="name-secondary">
                      {contact.company?.name || contact.email || '—'}
                    </div>
                  </div>
                  <span className={`status-badge ${contact.contact_type?.toLowerCase()}`}>
                    {contact.contact_type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
