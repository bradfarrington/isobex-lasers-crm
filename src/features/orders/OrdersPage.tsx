import { PageShell } from '@/components/layout/PageShell';
import { PackageCheck } from 'lucide-react';

export function OrdersPage() {
  return (
    <PageShell
      title="Orders"
      subtitle="Track orders, fulfilment status, and shipping across all channels."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <PackageCheck size={48} />
        </div>
        <h3>Orders & Fulfilment</h3>
        <p>
          View and manage orders from your online store and direct sales.
          Track fulfilment, shipping, and delivery status.
        </p>
      </div>
    </PageShell>
  );
}
