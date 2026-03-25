import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CrmPage } from '@/features/crm/CrmPage';
import { ContactDetailPage } from '@/features/crm/ContactDetailPage';
import { CompaniesPage } from '@/features/companies/CompaniesPage';
import { PipelinePage } from '@/features/pipeline/PipelinePage';
import { StorePage } from '@/features/store/StorePage';
import { ProductEditorPage } from '@/features/store/ProductEditorPage';
import { CollectionsPage } from '@/features/store/CollectionsPage';
import { InventoryPage } from '@/features/store/InventoryPage';
import { GiftCardsPage } from '@/features/store/GiftCardsPage';
import { DiscountsPage } from '@/features/store/DiscountsPage';
import { ShippingPage } from '@/features/store/ShippingPage';
import { SeoPage } from '@/features/store/SeoPage';
import { DomainPage } from '@/features/store/DomainPage';
import { UnifiedBuilder } from '@/features/store/UnifiedBuilder';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { EmailMarketingPage } from '@/features/email-marketing/EmailMarketingPage';
import { EmailBuilderPage } from '@/features/email-marketing/EmailBuilderPage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { InstallationsPage } from '@/features/installations/InstallationsPage';
import { SupportPage } from '@/features/support/SupportPage';
import { ReportingPage } from '@/features/reporting/ReportingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StorefrontLayout } from '@/features/storefront/StorefrontLayout';
import { StorefrontHome } from '@/features/storefront/StorefrontHome';
import { StorefrontProducts } from '@/features/storefront/StorefrontProducts';
import { StorefrontCollections } from '@/features/storefront/StorefrontCollections';
import { StorefrontCollectionDetail } from '@/features/storefront/StorefrontCollectionDetail';
import { StorefrontProductDetail } from '@/features/storefront/StorefrontProductDetail';
import { StorefrontCheckout } from '@/features/storefront/StorefrontCheckout';
import { StorefrontThankYou } from '@/features/storefront/StorefrontThankYou';
import { StorefrontGiftCards } from '@/features/storefront/StorefrontGiftCards';
import { UnsubscribePage } from '@/features/storefront/UnsubscribePage';

/**
 * Detect if the app is being served on a custom storefront domain.
 * On custom domains, only storefront routes are rendered (from root /).
 * On localhost / .vercel.app, the full CRM + storefront is available.
 */
function isStorefrontDomain(): boolean {
  const hostname = window.location.hostname;
  // CRM is accessible on localhost and the default Vercel domain
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  if (hostname.endsWith('.vercel.app')) return false;
  // Everything else is a custom domain → storefront only
  return true;
}

export function App() {
  const storefrontOnly = isStorefrontDomain();

  // Custom domain: only serve storefront routes from root (/)
  if (storefrontOnly) {
    return (
      <BrowserRouter>
        <Routes>
          <Route element={<StorefrontLayout />}>
            <Route index element={<StorefrontHome />} />
            <Route path="products" element={<StorefrontProducts />} />
            <Route path="products/:slug" element={<StorefrontProductDetail />} />
            <Route path="collections" element={<StorefrontCollections />} />
            <Route path="collections/:slug" element={<StorefrontCollectionDetail />} />
            <Route path="gift-cards" element={<StorefrontGiftCards />} />
            <Route path="checkout" element={<StorefrontCheckout />} />
            <Route path="thank-you/:orderId" element={<StorefrontThankYou />} />
          </Route>
          <Route path="unsubscribe/:token" element={<UnsubscribePage />} />
          {/* Catch-all: redirect any CRM routes to storefront home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Default: full CRM + storefront (localhost / .vercel.app)
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="crm/:id" element={<ContactDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          {/* Store sub-routes */}
          <Route path="store" element={<StorePage />} />
          <Route path="store/new" element={<ProductEditorPage />} />
          <Route path="store/:id" element={<ProductEditorPage />} />
          <Route path="store/collections" element={<CollectionsPage />} />
          <Route path="store/inventory" element={<InventoryPage />} />
          <Route path="store/gift-cards" element={<GiftCardsPage />} />
          <Route path="store/discounts" element={<DiscountsPage />} />
          <Route path="store/shipping" element={<ShippingPage />} />
          <Route path="store/seo" element={<SeoPage />} />
          <Route path="store/domain" element={<DomainPage />} />

          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="email-marketing" element={<EmailMarketingPage />} />
          <Route path="email-marketing/builder" element={<EmailBuilderPage />} />
          <Route path="email-marketing/builder/:id" element={<EmailBuilderPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="installations" element={<InstallationsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Unified Store Builder — Full-width, no CRM chrome */}
        <Route path="store/builder" element={<UnifiedBuilder />} />

        {/* Public: Unsubscribe */}
        <Route path="unsubscribe/:token" element={<UnsubscribePage />} />

        {/* Public Storefront — no CRM chrome */}
        <Route path="shop" element={<StorefrontLayout />}>
          <Route index element={<StorefrontHome />} />
          <Route path="products" element={<StorefrontProducts />} />
          <Route path="products/:slug" element={<StorefrontProductDetail />} />
          <Route path="collections" element={<StorefrontCollections />} />
          <Route path="collections/:slug" element={<StorefrontCollectionDetail />} />
          <Route path="gift-cards" element={<StorefrontGiftCards />} />
          <Route path="checkout" element={<StorefrontCheckout />} />
          <Route path="thank-you/:orderId" element={<StorefrontThankYou />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

