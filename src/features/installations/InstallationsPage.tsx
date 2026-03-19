import { PageShell } from '@/components/layout/PageShell';
import { Wrench } from 'lucide-react';

export function InstallationsPage() {
  return (
    <PageShell
      title="Installations"
      subtitle="Track laser machine installations and onboarding workflows."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Wrench size={48} />
        </div>
        <h3>Installation Tracking</h3>
        <p>
          Manage the end-to-end installation process from scheduling through to
          sign-off. Track engineers, checklists, and customer approvals.
        </p>
      </div>
    </PageShell>
  );
}
