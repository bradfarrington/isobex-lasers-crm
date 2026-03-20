import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { Gift } from 'lucide-react';

export function GiftCardsPage() {
  return (
    <PageShell
      title="Online Store"
      subtitle="Manage your ecommerce products, categories, and storefront."
    >
      <StoreTabBar />
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Gift size={48} />
        </div>
        <h3>Gift Cards</h3>
        <p>
          Gift card creation, design customisation, and management coming soon.
        </p>
      </div>
    </PageShell>
  );
}
