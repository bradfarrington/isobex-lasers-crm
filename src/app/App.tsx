import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { OrdersPage } from '@/features/orders/OrdersPage';
import { EmailMarketingPage } from '@/features/email-marketing/EmailMarketingPage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { InstallationsPage } from '@/features/installations/InstallationsPage';
import { SupportPage } from '@/features/support/SupportPage';
import { ReportingPage } from '@/features/reporting/ReportingPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export function App() {
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
          <Route path="orders" element={<OrdersPage />} />
          <Route path="email-marketing" element={<EmailMarketingPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="installations" element={<InstallationsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

