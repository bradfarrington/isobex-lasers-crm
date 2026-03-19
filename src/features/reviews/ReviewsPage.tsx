import { PageShell } from '@/components/layout/PageShell';
import { Star } from 'lucide-react';

export function ReviewsPage() {
  return (
    <PageShell
      title="Reviews & Reputation"
      subtitle="Request reviews, monitor feedback, and manage your online reputation."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Star size={48} />
        </div>
        <h3>Reputation Management</h3>
        <p>
          Send automated review requests after purchases and installations.
          Monitor Google and Trustpilot reviews from one dashboard.
        </p>
      </div>
    </PageShell>
  );
}
