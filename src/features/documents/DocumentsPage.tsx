import { PageShell } from '@/components/layout/PageShell';
import { FileText } from 'lucide-react';

export function DocumentsPage() {
  return (
    <PageShell
      title="Documents"
      subtitle="Manage contracts, installation guides, and support documentation."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <FileText size={48} />
        </div>
        <h3>Document Hub</h3>
        <p>
          Create, store, and share contracts, installation manuals, and
          support guides. Generate PDFs and track document delivery.
        </p>
      </div>
    </PageShell>
  );
}
