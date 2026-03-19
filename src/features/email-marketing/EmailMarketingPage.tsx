import { PageShell } from '@/components/layout/PageShell';
import { Mail } from 'lucide-react';

export function EmailMarketingPage() {
  return (
    <PageShell
      title="Email Marketing"
      subtitle="Build campaigns, design emails, and automate customer outreach."
    >
      <div className="module-placeholder">
        <div className="module-placeholder-icon">
          <Mail size={48} />
        </div>
        <h3>Email Campaigns</h3>
        <p>
          Design beautiful emails with the MJML builder, segment your audience,
          and automate drip campaigns and follow-ups.
        </p>
      </div>
    </PageShell>
  );
}
