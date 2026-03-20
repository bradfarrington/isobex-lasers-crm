import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { Percent } from 'lucide-react';

export function DiscountsPage() {
  return (
    <PageShell
      title="Online Store"
      subtitle="Manage your ecommerce products, categories, and storefront."
    >
      <StoreTabBar />
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Percent size={48} />
        </div>
        <h3>Discount Codes</h3>
        <p>
          Discount codes and promotions management coming soon.
        </p>
      </div>
    </PageShell>
  );
}
