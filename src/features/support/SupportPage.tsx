import { PageShell } from '@/components/layout/PageShell';
import { LifeBuoy } from 'lucide-react';

export function SupportPage() {
  return (
    <PageShell
      title="Support"
      subtitle="Support guides, ticket history, and customer help resources."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <LifeBuoy size={48} />
        </div>
        <h3>Customer Support</h3>
        <p>
          Manage support guides, track customer support tickets, and
          maintain a knowledge base for common laser machine queries.
        </p>
      </div>
    </PageShell>
  );
}
