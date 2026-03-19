import { PageShell } from '@/components/layout/PageShell';
import { Users, Search, UserPlus } from 'lucide-react';
import './CrmPage.css';

export function CrmPage() {
  return (
    <PageShell
      title="Contacts"
      subtitle="Manage your customer relationships and contact records."
      actions={
        <div className="crm-actions">
          <div className="crm-search">
            <Search size={16} />
            <input type="text" placeholder="Search contacts..." />
          </div>
          <button className="btn-primary">
            <UserPlus size={16} />
            Add Contact
          </button>
        </div>
      }
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Users size={48} />
        </div>
        <h3>Contact Management</h3>
        <p>
          Your central customer database. Add contacts, track interactions,
          link to deals, orders, and support tickets.
        </p>
      </div>
    </PageShell>
  );
}
