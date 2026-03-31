import { supabase } from '@/lib/supabase';
import type { EmailCampaign, CampaignRecipient, Order } from '@/types/database';

/* ═══════════════════════════════════════════════════════════
   Email Campaign Analytics Service
   Computes engagement & revenue stats from local DB data.
   ═══════════════════════════════════════════════════════════ */

export interface CampaignStat {
  id: string;
  name: string;
  subject: string;
  sentAt: string;
  totalRecipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  openRate: number;   // 0–100
  clickRate: number;  // 0–100
  unsubscribeRate: number; // 0-100
  revenue: number;    // attributed revenue (orders within window)
  orders: number;     // attributed order count
}

export interface EmailAnalyticsSummary {
  // Aggregate stats
  totalCampaigns: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  totalUnsubscribed: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgUnsubscribeRate: number;

  // Revenue (from orders table, filtered by time range)
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  orderRate: number; // orders / delivered * 100

  // Per-campaign data
  campaigns: CampaignStat[];

  // Time series for charts (grouped by date)
  openRateByDate: { date: string; openRate: number; clickRate: number }[];
}

function subDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export async function fetchEmailAnalytics(
  daysBack = 90,
  attributionWindowDays = 1,
): Promise<EmailAnalyticsSummary> {
  const startDate = daysBack === 9999 ? new Date('2020-01-01') : subDays(new Date(), daysBack);

  // Fetch sent campaigns
  const { data: rawCampaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false });

  const allCampaigns = (rawCampaigns || []) as EmailCampaign[];

  // Filter by date range
  const campaigns = allCampaigns.filter(c => {
    if (!c.sent_at) return false;
    return new Date(c.sent_at) >= startDate;
  });

  // Fetch all recipients for these campaigns
  const campaignIds = campaigns.map(c => c.id);
  let allRecipients: CampaignRecipient[] = [];
  if (campaignIds.length > 0) {
    // Supabase `.in()` has a limit, so batch if needed
    const batchSize = 50;
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      const batch = campaignIds.slice(i, i + batchSize);
      const { data } = await supabase
        .from('campaign_recipients')
        .select('*')
        .in('campaign_id', batch);
      if (data) allRecipients = allRecipients.concat(data as CampaignRecipient[]);
    }
  }

  // Group recipients by campaign
  const recipientsByCampaign: Record<string, CampaignRecipient[]> = {};
  for (const r of allRecipients) {
    if (!recipientsByCampaign[r.campaign_id]) recipientsByCampaign[r.campaign_id] = [];
    recipientsByCampaign[r.campaign_id].push(r);
  }

  // ── Fetch ALL paid orders (we need the full range for attribution windows) ──
  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id, total, status, payment_status, created_at')
    .in('payment_status', ['paid', 'partially_refunded'])
    .order('created_at', { ascending: false });

  const orders = (rawOrders || []) as Pick<Order, 'id' | 'total' | 'status' | 'payment_status' | 'created_at'>[];

  // ── Conversion Summary: orders directly within time range ──
  const summaryOrders = orders.filter(o => new Date(o.created_at) >= startDate);
  const summaryTotalRevenue = summaryOrders.reduce((s, o) => s + (o.total || 0), 0);
  const summaryTotalOrders = summaryOrders.length;

  // Build per-campaign stats
  const campaignStats: CampaignStat[] = campaigns.map(c => {
    const recips = recipientsByCampaign[c.id] || [];
    const total = recips.length || c.total_recipients || 0;
    const stats = (c.stats || {}) as Record<string, any>;

    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let failed = 0;
    let unsubscribed = 0;

    if (recips.length > 0) {
      // ── Native CRM campaigns: count engagement from recipient records ──
      for (const r of recips) {
        if (r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'clicked') delivered++;
        if (r.status === 'opened' || r.status === 'clicked') opened++;
        if (r.status === 'clicked') clicked++;
        if (r.status === 'bounced') bounced++;
        if (r.status === 'failed') failed++;
        if (r.status === 'unsubscribed') unsubscribed++;
      }
    } else {
      // ── Imported campaigns (e.g. HighLevel): read engagement from stats JSONB ──
      delivered = stats.delivered ?? total;
      opened = stats.opened ?? 0;
      clicked = stats.clicked ?? 0;
      bounced = stats.bounced ?? 0;
      failed = stats.failed ?? 0;
      unsubscribed = stats.unsubscribed ?? 0;
    }

    // ── Revenue attribution: orders placed within attribution window after campaign sent ──
    // This applies to ALL campaigns (native + imported)
    let revenue = 0;
    let orderCount = 0;
    if (c.sent_at) {
      const sentDate = new Date(c.sent_at);
      const windowEnd = addDays(sentDate, attributionWindowDays);
      for (const o of orders) {
        const orderDate = new Date(o.created_at);
        if (orderDate >= sentDate && orderDate <= windowEnd) {
          revenue += o.total || 0;
          orderCount++;
        }
      }
    }

    const denominator = delivered || total || 1;
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      sentAt: c.sent_at || c.created_at,
      totalRecipients: total,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      unsubscribed,
      openRate: (opened / denominator) * 100,
      clickRate: (clicked / denominator) * 100,
      unsubscribeRate: (unsubscribed / denominator) * 100,
      revenue,
      orders: orderCount,
    };
  });

  // Aggregate totals (engagement only — revenue comes from direct order query)
  const totalCampaigns = campaignStats.length;
  const totalDelivered = campaignStats.reduce((s, c) => s + c.delivered, 0);
  const totalOpened = campaignStats.reduce((s, c) => s + c.opened, 0);
  const totalClicked = campaignStats.reduce((s, c) => s + c.clicked, 0);
  const totalBounced = campaignStats.reduce((s, c) => s + c.bounced, 0);
  const totalFailed = campaignStats.reduce((s, c) => s + c.failed, 0);
  const totalUnsubscribed = campaignStats.reduce((s, c) => s + c.unsubscribed, 0);

  // Average rates (mean of per-campaign rates, not overall ratio)
  const ratedCampaigns = campaignStats.filter(c => c.delivered > 0);
  const avgOpenRate = ratedCampaigns.length > 0
    ? ratedCampaigns.reduce((s, c) => s + c.openRate, 0) / ratedCampaigns.length : 0;
  const avgClickRate = ratedCampaigns.length > 0
    ? ratedCampaigns.reduce((s, c) => s + c.clickRate, 0) / ratedCampaigns.length : 0;
  const avgUnsubscribeRate = ratedCampaigns.length > 0
    ? ratedCampaigns.reduce((s, c) => s + c.unsubscribeRate, 0) / ratedCampaigns.length : 0;
  const avgOrderValue = summaryTotalOrders > 0 ? summaryTotalRevenue / summaryTotalOrders : 0;
  const orderRate = totalDelivered > 0 ? (summaryTotalOrders / totalDelivered) * 100 : 0;

  // Open rate by date (group campaigns by sent date)
  const dateMap: Record<string, { opens: number; clicks: number; delivered: number; ts: number }> = {};
  for (const c of campaignStats) {
    const d = new Date(c.sentAt);
    const dateStr = formatShortDate(d);
    if (!dateMap[dateStr]) dateMap[dateStr] = { opens: 0, clicks: 0, delivered: 0, ts: d.getTime() };
    dateMap[dateStr].opens += c.opened;
    dateMap[dateStr].clicks += c.clicked;
    dateMap[dateStr].delivered += c.delivered;
  }

  const openRateByDate = Object.entries(dateMap)
    .map(([date, d]) => ({
      date,
      openRate: d.delivered > 0 ? (d.opens / d.delivered) * 100 : 0,
      clickRate: d.delivered > 0 ? (d.clicks / d.delivered) * 100 : 0,
      _ts: d.ts,
    }))
    .sort((a, b) => a._ts - b._ts)
    .map(({ _ts, ...rest }) => rest);

  return {
    totalCampaigns,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalFailed,
    totalUnsubscribed,
    avgOpenRate,
    avgClickRate,
    avgUnsubscribeRate,
    totalRevenue: summaryTotalRevenue,
    totalOrders: summaryTotalOrders,
    avgOrderValue,
    orderRate,
    campaigns: campaignStats,
    openRateByDate,
  };
}
