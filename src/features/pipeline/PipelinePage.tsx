import { PageShell } from '@/components/layout/PageShell';
import { Target } from 'lucide-react';

export function PipelinePage() {
  return (
    <PageShell
      title="Sales Pipeline"
      subtitle="Track high-ticket laser machine sales from lead to close."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Target size={48} />
        </div>
        <h3>Deals Pipeline</h3>
        <p>
          Visualise your sales funnel with drag-and-drop stages. Track deal
          values, expected close dates, and link deals to contacts and companies.
        </p>
      </div>
    </PageShell>
  );
}
