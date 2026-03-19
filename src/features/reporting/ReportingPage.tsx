import { PageShell } from '@/components/layout/PageShell';
import { BarChart3 } from 'lucide-react';

export function ReportingPage() {
  return (
    <PageShell
      title="Reporting"
      subtitle="Business analytics, sales metrics, and operational dashboards."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <BarChart3 size={48} />
        </div>
        <h3>Analytics & Reports</h3>
        <p>
          Visualise key business metrics across sales, orders, marketing,
          and support. Build custom reports and export data.
        </p>
      </div>
    </PageShell>
  );
}
