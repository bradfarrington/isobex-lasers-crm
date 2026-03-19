import { PageShell } from '@/components/layout/PageShell';
import { ShoppingBag } from 'lucide-react';

export function StorePage() {
  return (
    <PageShell
      title="Online Store"
      subtitle="Manage your ecommerce products, categories, and storefront."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <ShoppingBag size={48} />
        </div>
        <h3>Store Management</h3>
        <p>
          Manage product listings, pricing, inventory, categories, and
          storefront settings for your online shop.
        </p>
      </div>
    </PageShell>
  );
}
