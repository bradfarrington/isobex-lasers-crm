import { PageShell } from '@/components/layout/PageShell';
import { Building2 } from 'lucide-react';

export function CompaniesPage() {
  return (
    <PageShell
      title="Companies"
      subtitle="Manage business accounts and company records."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Building2 size={48} />
        </div>
        <h3>Company Records</h3>
        <p>
          Track organisations, link multiple contacts per company, and manage
          B2B relationships for laser machine sales.
        </p>
      </div>
    </PageShell>
  );
}
