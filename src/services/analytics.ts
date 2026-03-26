import { supabase } from '@/lib/supabase';
import type { PageView } from '@/types/database';

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  avgTimeSeconds: number;
  
  viewsChange: number;
  visitorsChange: number;
  revenueChange: number;
  conversionChange: number;
  avgTimeChange: number;
  
  formViews: number;
  formSubmits: number;
  
  storeFunnel: {
    views: number;
    add_to_cart: number;
    checkouts: number;
    purchases: number;
  };

  topPages: { path: string; title: string; views: number }[];
  devices: { name: string; value: number }[];
  browsers: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  viewsByDate: { date: string; views: number; unique: number }[];
  revenueByDate: { date: string; revenue: number; orders: number }[];
  timeByDate: { date: string; avgTime: number }[];
}

function subDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export async function fetchAnalyticsData(daysBack = 90, source: 'all'|'storefront'|'website' = 'all'): Promise<AnalyticsSummary> {
  const startDate = subDays(new Date(), daysBack);
  const prevStartDate = subDays(new Date(), daysBack * 2);
  
  // Fetch raw page views
  const { data: pageViews } = await supabase
    .from('page_views')
    .select('*')
    .gte('created_at', prevStartDate.toISOString());
    
  // Fetch raw ecommerce events
  const { data: ecomEvents } = await supabase
    .from('ecommerce_events')
    .select('*')
    .gte('created_at', prevStartDate.toISOString());

  // Fetch true historical orders bypassing RLS securely via RPC
  const { data: nativeOrders, error: rpcErr } = await supabase
    .rpc('get_analytics_orders', { start_dt: prevStartDate.toISOString() });
  
  if (rpcErr) {
    console.error("[Analytics] Error fetching raw orders via RPC:", rpcErr);
  }

  let allViews = (pageViews || []) as PageView[];
  let allEvents = (ecomEvents || []) as any[];

  if (source === 'storefront') {
    allViews = allViews.filter(v => v.url.includes('store.isobex'));
  } else if (source === 'website') {
    allViews = allViews.filter(v => !v.url.includes('store.isobex') && v.url.includes('isobex'));
  }

  const views = allViews.filter(v => new Date(v.created_at) >= startDate);
  const prevViews = allViews.filter(v => new Date(v.created_at) >= prevStartDate && new Date(v.created_at) < startDate);
  
  const events = allEvents.filter(e => new Date(e.created_at) >= startDate);

  // Process Views
  const totalViews = views.length;
  const prevTotalViews = prevViews.length;
  
  const uniqueVisitors = new Set(views.map(v => v.session_id)).size;
  const prevUniqueVisitors = new Set(prevViews.map(v => v.session_id)).size;

  const avgTimeSeconds = views.length > 0 ? views.reduce((sum, v) => sum + (v.active_seconds || 0), 0) / views.length : 0;
  const prevAvgTimeSeconds = prevViews.length > 0 ? prevViews.reduce((sum, v) => sum + (v.active_seconds || 0), 0) / prevViews.length : 0;

  // Process Ecommerce
  const allOrders = (nativeOrders || []) as any[];
  const validOrders = allOrders.filter(o => new Date(o.created_at) >= startDate && o.is_test !== true);
  const prevValidOrders = allOrders.filter(o => new Date(o.created_at) >= prevStartDate && new Date(o.created_at) < startDate && o.is_test !== true);
  
  const totalOrders = validOrders.length;
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const prevTotalRevenue = prevValidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const conversionRate = uniqueVisitors > 0 ? (totalOrders / uniqueVisitors) * 100 : 0;
  const prevConversionRate = prevUniqueVisitors > 0 ? (prevValidOrders.length / prevUniqueVisitors) * 100 : 0;

  const formViews = events.filter(e => e.event_type === 'form_view').length;
  const formSubmits = events.filter(e => e.event_type === 'form_submit').length;

  const storeFunnel = {
    views: events.filter(e => e.event_type === 'view_item').length,
    add_to_cart: events.filter(e => e.event_type === 'add_to_cart').length,
    checkouts: events.filter(e => e.event_type === 'begin_checkout').length,
    purchases: validOrders.length
  };

  // Change Percentages
  const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  
  const viewsChange = calcChange(totalViews, prevTotalViews);
  const visitorsChange = calcChange(uniqueVisitors, prevUniqueVisitors);
  const revenueChange = calcChange(totalRevenue, prevTotalRevenue);
  const conversionChange = calcChange(conversionRate, prevConversionRate);
  const avgTimeChange = calcChange(avgTimeSeconds, prevAvgTimeSeconds);

  // Group by Date for charts
  const viewsByDate: { date: string; views: number; unique: number }[] = [];
  const revenueByDate: { date: string; revenue: number; orders: number }[] = [];
  const timeByDate: { date: string; avgTime: number }[] = [];
  
  for (let i = daysBack; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = formatShortDate(d);
    
    const dayViews = views.filter(v => isSameDay(new Date(v.created_at), d));
    const dayUnique = new Set(dayViews.map(v => v.session_id)).size;
    viewsByDate.push({ date: dateStr, views: dayViews.length, unique: dayUnique });
    
    const dayAvgTime = dayViews.length > 0 ? dayViews.reduce((sum, v) => sum + (v.active_seconds || 0), 0) / dayViews.length : 0;
    timeByDate.push({ date: dateStr, avgTime: Math.round(dayAvgTime) });
    
    const dayPurchases = validOrders.filter(p => isSameDay(new Date(p.created_at), d));
    const dayRevenue = dayPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
    revenueByDate.push({ date: dateStr, revenue: dayRevenue, orders: dayPurchases.length });
  }

  // Top Pages
  const pageMap: Record<string, { title: string; views: number }> = {};
  views.forEach(v => {
    if (!pageMap[v.path]) pageMap[v.path] = { title: v.title || v.path, views: 0 };
    pageMap[v.path].views++;
  });
  const topPages = Object.entries(pageMap)
    .map(([path, data]) => ({ path, title: data.title, views: data.views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 7);

  // Devices
  const devMap: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
  const browserMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};

  views.forEach(v => {
    let dt = 'Desktop';
    if (v.device_type) {
      dt = v.device_type.charAt(0).toUpperCase() + v.device_type.slice(1);
    }
    devMap[dt] = (devMap[dt] || 0) + 1;
    
    const br = v.browser || 'Unknown';
    browserMap[br] = (browserMap[br] || 0) + 1;
    
    const cy = v.country || 'Unknown';
    countryMap[cy] = (countryMap[cy] || 0) + 1;
  });
  
  const devices = Object.entries(devMap)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
    
  const browsers = Object.entries(browserMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
    
  const countries = Object.entries(countryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    totalViews,
    uniqueVisitors,
    totalOrders,
    totalRevenue,
    conversionRate,
    avgTimeSeconds,
    viewsChange,
    visitorsChange,
    revenueChange,
    conversionChange,
    avgTimeChange,
    formViews,
    formSubmits,
    storeFunnel,
    topPages,
    devices,
    browsers,
    countries,
    viewsByDate,
    revenueByDate,
    timeByDate
  };
}
