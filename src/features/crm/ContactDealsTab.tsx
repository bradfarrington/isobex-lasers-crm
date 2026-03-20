import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '@/lib/api';
import type { PipelineDeal } from '@/types/database';
import {
  Target,
  PoundSterling,
  Calendar,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import './ContactDealsTab.css';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
};

interface ContactDealsTabProps {
  contactId: string;
}

export function ContactDealsTab({ contactId }: ContactDealsTabProps) {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api
      .fetchPipelineDealsByContact(contactId)
      .then((data) => setDeals(data))
      .catch((err) => console.error('Failed to load deals:', err))
      .finally(() => setLoading(false));
  }, [contactId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="contact-deals-loading">
        <p>Loading deals…</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="contact-deals-empty">
        <div className="contact-deals-empty-icon">
          <Target size={32} />
        </div>
        <h4>No Deals</h4>
        <p>
          This contact is not in any pipeline yet. Add them to a pipeline from
          the Pipeline page.
        </p>
      </div>
    );
  }

  return (
    <div className="contact-deals-list">
      {deals.map((deal) => {
        const fd = deal.field_data || {};
        const stageName = (deal.stage as any)?.name || 'Unknown Stage';
        const stageColor = (deal.stage as any)?.color || '#6b7280';
        const pipelineName =
          (deal.stage as any)?.pipeline?.name || 'Unknown Pipeline';
        const pipelineId = (deal.stage as any)?.pipeline_id || null;

        return (
          <div
            className="contact-deal-card"
            key={deal.id}
            onClick={() => pipelineId && navigate('/pipeline')}
            style={{ cursor: pipelineId ? 'pointer' : 'default' }}
            title="Click to open in pipeline"
          >
            <div className="contact-deal-card-top">
              <div className="contact-deal-card-title">
                {fd.deal_name || 'Untitled Deal'}
              </div>
              <div className="contact-deal-card-pipeline">
                {pipelineName}
              </div>
            </div>

            <div className="contact-deal-card-stage">
              <span
                className="contact-deal-stage-dot"
                style={{ backgroundColor: stageColor }}
              />
              <span className="contact-deal-stage-name">{stageName}</span>
            </div>

            <div className="contact-deal-card-meta">
              {fd.value != null && fd.value !== '' && (
                <span className="contact-deal-badge value">
                  <PoundSterling size={10} />
                  {formatCurrency(Number(fd.value))}
                </span>
              )}
              {fd.expected_close_date && (
                <span className="contact-deal-badge date">
                  <Calendar size={10} />
                  {formatDate(fd.expected_close_date)}
                </span>
              )}
              {fd.priority && (
                <span
                  className="contact-deal-badge priority"
                  style={{
                    color: PRIORITY_COLORS[fd.priority] || '#6b7280',
                  }}
                >
                  <AlertTriangle size={10} />
                  {fd.priority}
                </span>
              )}
              {fd.notes && (
                <span className="contact-deal-badge notes" title={fd.notes}>
                  <FileText size={10} />
                  Notes
                </span>
              )}
            </div>

            <div className="contact-deal-card-date">
              Added {formatDate(deal.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
