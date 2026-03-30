import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useAlert } from '@/components/ui/AlertDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import type { GooglePlaceOverview, GoogleReview, ReviewRequest } from '@/types/database';
import {
  Star, StarHalf, Search, Filter, Mail, Plus, X,
  ExternalLink, CheckCircle2, Navigation, Send, Loader2,
  Clock, ArrowRight, Bot, User
} from 'lucide-react';
import { AutomationTab } from './AutomationTab';
import './ReviewsPage.css';
import './AutomationTab.css';

/* ═══════════════════════════════════════════
   Tabs
   ═══════════════════════════════════════════ */

const TABS = [
  // { id: 'overview', label: 'Overview' },
  // { id: 'all_reviews', label: 'All Reviews' },
  { id: 'requests', label: 'Review Requests' },
  { id: 'automation', label: 'Automation' },
];

export function ReviewsPage() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <PageShell
      title="Reviews & Reputation"
      subtitle="Monitor Google Business Profile feedback and manage your online reputation."
      actions={
        activeTab === 'requests' && (
          <button className="btn-brand" onClick={() => document.getElementById('btn-send-request')?.click()}>
            <Plus size={16} /> Send Request
          </button>
        )
      }
    >
      <div className="reviews-page">
        <div className="reviews-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`reviews-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="reviews-content">
          {activeTab === 'overview' && <OverviewTab onSeeAll={() => setActiveTab('all_reviews')} />}
          {activeTab === 'all_reviews' && <AllReviewsTab />}
          {activeTab === 'requests' && <ReviewRequestsTab />}
          {activeTab === 'automation' && <AutomationTab />}
        </div>
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════════
   Reusable Star Renderer
   ═══════════════════════════════════════════ */

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="star-rating" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} fill="#f59e0b" color="#f59e0b" />
      ))}
      {hasHalfStar && <StarHalf size={size} fill="#f59e0b" color="#f59e0b" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} color="#e5e7eb" />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tab 1: Overview
   ═══════════════════════════════════════════ */

function OverviewTab({ onSeeAll }: { onSeeAll: () => void }) {
  const [data, setData] = useState<GooglePlaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fetchGoogleReviews()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="reviews-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading Google Reviews…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="reviews-error">
        <div className="reviews-error-icon"><ExternalLink size={32} /></div>
        <h3>Google Integration Required</h3>
        <p>{error || 'Please connect your Google Business Profile in Settings.'}</p>
        <button className="btn-secondary" onClick={() => window.location.href = '/settings'}>Go to Settings</button>
      </div>
    );
  }

  // Calculate rating distribution locally from fetched reviews
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  data.reviews.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.floor(r.rating))) as 1|2|3|4|5;
    dist[star]++;
  });
  const maxCount = Math.max(...Object.values(dist)) || 1;
  const avgRating = data.rating || 0;
  const totalReviews = data.userRatingCount || data.reviews.length;

  return (
    <div className="overview-tab">
      <div className="overview-layout">
        <div className="overview-summary-card">
          <div className="overview-header">
            <h4>Google Workspace</h4>
            <div className="overview-badge">Business Profile</div>
          </div>
          <div className="overview-main-stats">
            <div className="overview-score">{avgRating.toFixed(1)}</div>
            <div className="overview-stars-stack">
              <StarRating rating={avgRating} size={20} />
              <span>Based on {totalReviews} reviews</span>
            </div>
          </div>

          <div className="overview-distribution">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = dist[star as 1|2|3|4|5];
              const pct = (count / maxCount) * 100;
              return (
                <div key={star} className="dist-row">
                  <div className="dist-label">{star} <Star size={10} fill="#f59e0b" color="#f59e0b" /></div>
                  <div className="dist-bar-track">
                    <div className="dist-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="dist-count">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overview-recent-card">
          <div className="recent-header">
            <h4>Recent Reviews</h4>
            <button className="btn-text" onClick={onSeeAll}>View All <ArrowRight size={14} /></button>
          </div>
          <div className="recent-list">
            {data.reviews.slice(0, 5).map((rev, i) => (
              <ReviewCard key={i} review={rev} />
            ))}
            {data.reviews.length === 0 && (
              <div className="recent-empty">No reviews found for this profile yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tab 2: All Reviews
   ═══════════════════════════════════════════ */

function AllReviewsTab() {
  const [data, setData] = useState<GooglePlaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    api.fetchGoogleReviews()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="reviews-loading"><Loader2 size={32} className="spin" /></div>;
  }
  if (!data) {
    return <div className="reviews-empty">No data available. Check Google Settings.</div>;
  }

  const filtered = filterRating
    ? data.reviews.filter(r => Math.floor(r.rating) === filterRating)
    : data.reviews;

  return (
    <div className="all-reviews-tab">
      <div className="reviews-toolbar">
        <div className="toolbar-group">
          <Filter size={16} color="var(--color-text-tertiary)" />
          <span>Filter by Rating:</span>
          <SearchableSelect
            className="form-select"
            value={filterRating ? filterRating.toString() : ''}
            onChange={val => setFilterRating(val ? Number(val) : null)}
            searchable={false}
            sort={false}
            options={[
              { label: 'All Ratings', value: '' },
              { label: '5 Stars', value: '5' },
              { label: '4 Stars', value: '4' },
              { label: '3 Stars', value: '3' },
              { label: '2 Stars', value: '2' },
              { label: '1 Star', value: '1' },
            ]}
          />
        </div>
      </div>

      <div className="reviews-grid">
        {filtered.length > 0 ? (
          filtered.map((rev, i) => <ReviewCard key={i} review={rev} />)
        ) : (
          <div className="reviews-empty">No reviews match the current filter.</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Review Card Component
   ═══════════════════════════════════════════ */

function ReviewCard({ review }: { review: GoogleReview }) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        {review.authorPhotoUri ? (
          <img src={review.authorPhotoUri} alt={review.authorName} className="review-avatar" />
        ) : (
          <div className="review-avatar-fallback">{review.authorName.charAt(0)}</div>
        )}
        <div className="review-meta">
          <div className="review-author">{review.authorName}</div>
          <div className="review-rating-row">
            <StarRating rating={review.rating} size={12} />
            <span className="review-time">{review.relativePublishTimeDescription}</span>
          </div>
        </div>
      </div>
      <p className="review-text">{review.text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tab 3: Review Requests
   ═══════════════════════════════════════════ */

function ReviewRequestsTab() {
  const { showAlert } = useAlert();
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    api.fetchReviewRequests()
      .then(setRequests)
      .catch(err => showAlert({ title: 'Error', message: 'Failed to load requests: ' + err.message, variant: 'danger' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="review-requests-tab">
      {/* Hidden button to be clicked from PageShell actions */}
      <button id="btn-send-request" style={{ display: 'none' }} onClick={() => setShowModal(true)}>Open</button>

      <div className="requests-table-container">
        {loading ? (
          <div className="reviews-loading"><Loader2 size={32} className="spin" /></div>
        ) : requests.length === 0 ? (
          <div className="reviews-empty">
            <div className="reviews-empty-icon"><Mail size={32} /></div>
            <h3>No requests sent yet</h3>
            <p>Send a review request to your customers to manage your Google reputation.</p>
            <button className="btn-brand mt-4" onClick={() => setShowModal(true)}>Send First Request</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Source</th>
                <th>Status</th>
                <th>Sends</th>
                <th>Sent Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td className="font-medium text-primary">{req.contact_name}</td>
                  <td>{req.contact_email}</td>
                  <td>
                    <span className={`source-badge ${req.source || 'manual'}`}>
                      {req.source === 'automated' ? <><Bot size={11} /> Auto</> : <><User size={11} /> Manual</>}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${req.status}`}>
                      {req.status === 'sent' && <Navigation size={12} />}
                      {req.status === 'opened' && <Clock size={12} />}
                      {req.status === 'clicked' && <CheckCircle2 size={12} />}
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      {req.sequence_completed && ' ✓'}
                    </span>
                  </td>
                  <td>{req.send_count || 1}</td>
                  <td>{new Date(req.last_sent_at || req.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <SendRequestModal onClose={() => setShowModal(false)} onSent={loadRequests} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Send Request Modal
   ═══════════════════════════════════════════ */

function SendRequestModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [reviewLink, setReviewLink] = useState('');

  // Search contacts and Get Link
  useEffect(() => {
    api.fetchGoogleSettings().then(s => {
      if (s?.google_review_link) setReviewLink(s.google_review_link);
    });
  }, []);

  useEffect(() => {
    if (search.length < 2 && !selectedContact) {
      setContacts([]);
      return;
    }
    supabase.from('contacts')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      .not('email', 'is', null)
      .limit(5)
      .then(({ data }) => {
        if (data) {
          setContacts(data.map(c => ({
            id: c.id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer',
            email: c.email!
          })));
        }
      });
  }, [search]);

  const handleSend = async () => {
    if (!selectedContact) return;
    setSending(true);
    try {
      await api.createReviewRequest({
        contact_id: selectedContact.id,
        contact_email: selectedContact.email,
        contact_name: selectedContact.name,
        status: 'sent',
        order_id: null,
        source: 'manual',
        send_count: 1,
        next_send_at: null,
        sequence_completed: true,
        last_sent_at: new Date().toISOString(),
      });

      // Build the email HTML right here on the frontend to avoid deploying new Edge Functions
      const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f4;"><div style="max-width:600px;margin:0 auto;background:#ffffff;"><div style="background:#1a1a1a;padding:30px 20px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:24px;">Customer Support</h1></div><div style="padding:40px 30px;text-align:center;"><h2 style="margin-top:0;color:#1a1a1a;">How did we do?</h2><p style="color:#555;font-size:16px;line-height:1.6;margin-bottom:30px;">Hi ${selectedContact.name},<br><br>Thank you for choosing us. We hope you had a great experience with us. If you have a moment, we would really appreciate it if you could leave us a review on Google.</p><a href="${reviewLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:6px;font-size:16px;">Leave a Review on Google</a></div><div style="text-align:center;padding:20px;background:#f4f4f4;"><p style="font-size:12px;color:#aaa;margin:0;">Thank you</p></div></div></body></html>`;

      // Call the existing edge function test_builder action to send it instantly
      const res = await supabase.functions.invoke('send-email', {
        body: { 
           action: 'test_builder', 
           toEmail: selectedContact.email,
           subject: 'How did we do?',
           html: emailHtml
        }
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      showAlert({ title: 'Sent successfully', message: `Review request sent to ${selectedContact.email}`, variant: 'success' });
      onSent();
      onClose();
    } catch (err: any) {
      showAlert({ title: 'Failed to send', message: err.message || 'Unknown error', variant: 'danger' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content review-request-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Send Review Request</h3>
          <button className="row-action-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {!reviewLink && (
            <div className="config-warning mb-4">
              <strong>Warning:</strong> You haven't connected your Google Business Profile yet. The review button will not work.
            </div>
          )}

          <div className="form-group mb-4">
            <label>Select Customer</label>
            {!selectedContact ? (
              <div className="contact-search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="form-input dt-search"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {contacts.length > 0 && (
                  <ul className="contact-results">
                    {contacts.map(c => (
                      <li key={c.id} onClick={() => setSelectedContact(c)}>
                        <div className="contact-name">{c.name}</div>
                        <div className="contact-email">{c.email}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="selected-contact-chip">
                <div>
                  <strong>{selectedContact.name}</strong>
                  <span>{selectedContact.email}</span>
                </div>
                <button className="row-action-btn" onClick={() => setSelectedContact(null)}><X size={14} /></button>
              </div>
            )}
          </div>

          <div className="email-preview">
            <div className="preview-label">Email Preview</div>
            <div className="preview-box">
              <h2>How did we do?</h2>
              <p>Hi {selectedContact?.name || 'Customer'},</p>
              <p>Thank you for choosing us. We hope you had a great experience. If you have a moment, we would really appreciate it if you could leave us a review on Google.</p>
              <div className="preview-cta">Leave a Review on Google</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn-brand" onClick={handleSend} disabled={!selectedContact || sending}>
            {sending ? <><Loader2 size={16} className="spin" /> Sending…</> : <><Send size={16} /> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}
