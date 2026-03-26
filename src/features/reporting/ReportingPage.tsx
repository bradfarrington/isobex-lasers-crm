import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { ArrowDown, ArrowUp, Users, Eye, ShoppingCart, MousePointerClick, Globe } from 'lucide-react';
import { fetchAnalyticsData, type AnalyticsSummary } from '@/services/analytics';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import './ReportingPage.css';

const PRIMARY_COLOR = '#4f46e5'; // Indigo-600
const SECONDARY_COLOR = '#0ea5e9'; // Sky-500
const SUCCESS_COLOR = '#10b981'; // Emerald-500
const PIE_COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

export function ReportingPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [source, setSource] = useState<'all'|'storefront'|'website'>('all');

  useEffect(() => {
    setLoading(true);
    fetchAnalyticsData(days, source).then(d => {
      console.log("[Analytics] Fetched data for", source, ":", d);
      setData(d);
      setLoading(false);
    });
  }, [days, source]);

  if (loading || !data) {
    return (
      <PageShell title="Reporting Overview" subtitle="Loading your business metrics...">
        <div className="analytics-loading-wrapper">
          <div className="analytics-spinner" />
          <p>Crunching the numbers...</p>
        </div>
      </PageShell>
    );
  }

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <PageShell
      title="Analytics Overview"
      subtitle={days === 9999 ? 'All-time performance metrics' : `Performance metrics for the last ${days} days`}
    >
      <div className="analytics-header-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="time-filters source-filters">
          <button className={`time-filter-btn ${source === 'all' ? 'active' : ''}`} onClick={() => setSource('all')}>🌎 All Traffic</button>
          <button className={`time-filter-btn ${source === 'website' ? 'active' : ''}`} onClick={() => setSource('website')}>🖥️ Website</button>
          <button className={`time-filter-btn ${source === 'storefront' ? 'active' : ''}`} onClick={() => setSource('storefront')}>🛒 Online Store</button>
        </div>
        <div className="time-filters">
          {[7, 14, 30, 90].map(d => (
            <button key={d} className={`time-filter-btn ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
              {d} Days
            </button>
          ))}
          <button className={`time-filter-btn ${days === 9999 ? 'active' : ''}`} onClick={() => setDays(9999)}>
            All
          </button>
        </div>
      </div>

      <div className="analytics-premium-dashboard">
        
        {/* Top Stat Cards Grid */}
        <div className="premium-stat-grid">
          <StatCard 
            title={source === 'storefront' ? "Total Sessions" : "Unique Users"}
            value={data.uniqueVisitors.toLocaleString()} 
            change={data.visitorsChange} 
            icon={<Users size={20} />}
            sparklineData={data.viewsByDate}
            dataKey="unique"
            color={PRIMARY_COLOR}
          />
          <StatCard 
            title="Total Page Views" 
            value={data.totalViews.toLocaleString()} 
            change={data.viewsChange} 
            icon={<Eye size={20} />}
            sparklineData={data.viewsByDate}
            dataKey="views"
            color={SECONDARY_COLOR}
          />

          {source === 'website' ? (
            <>
              <StatCard 
                title="Total Form Views" 
                value={data.formViews.toLocaleString()} 
                change={0} 
                icon={<Eye size={20} />}
                sparklineData={data.viewsByDate} // Re-using view data for generic sparkline shape
                dataKey="views"
                color={SUCCESS_COLOR}
              />
              <StatCard 
                title="Completion Rate" 
                value={`${data.formViews > 0 ? ((data.formSubmits / data.formViews)*100).toFixed(2) : '0.00'}%`} 
                change={0} 
                icon={<MousePointerClick size={20} />}
                sparklineData={data.viewsByDate}
                dataKey="views"
                color="#ec4899"
              />
            </>
          ) : (
            <>
              <StatCard 
                title="Total Revenue" 
                value={`£${data.totalRevenue.toLocaleString()}`} 
                change={data.revenueChange} 
                icon={<ShoppingCart size={20} />}
                sparklineData={data.revenueByDate}
                dataKey="revenue"
                color={SUCCESS_COLOR}
              />
              <StatCard 
                title="Conversion Rate" 
                value={`${data.conversionRate.toFixed(1)}%`} 
                change={data.conversionChange} 
                icon={<MousePointerClick size={20} />}
                sparklineData={data.revenueByDate}
                dataKey="orders"
                color="#ec4899"
              />
            </>
          )}
        </div>

        {/* Traffic Geography & Devices Grid */}
        <div className="premium-2col">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="card-title-group">
                <div className="card-icon"><Globe size={18} /></div>
                <h3>Traffic Sources by Country</h3>
              </div>
            </div>
            <div className="country-list-interactive">
              {data.countries.slice(0, 6).map((c, i) => {
                const maxVal = data.countries[0]?.value || 1;
                const pct = Math.round((c.value / maxVal) * 100);
                const flag = getFlag(c.name);
                return (
                  <div className="country-row" key={i}>
                    <div className="country-identity">
                      <span className="country-flag">{flag}</span>
                      <span className="country-name">{c.name}</span>
                    </div>
                    <div className="country-metrics">
                      <span className="country-val">{c.value.toLocaleString()}</span>
                      <div className="country-bar-track">
                        <div className="country-bar-fill" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.countries.length === 0 && (
                <div className="empty-state">No geographical data recorded yet.</div>
              )}
            </div>
          </div>

          <div className="premium-card">
            <div className="premium-card-header">
              <h3>Device Breakdown</h3>
            </div>
            <div className="device-chart-wrapper">
              <div className="donut-interactive">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.devices}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                      paddingAngle={3} dataKey="value" nameKey="name"
                      stroke="none"
                    >
                      {data.devices.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="donut-legend-right">
                {data.devices.map((dev, i) => (
                  <div className="legend-interactive-item" key={i}>
                    <span className="dot" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                    <div className="legend-text">
                      <span className="legend-name">{dev.name}</span>
                      <span className="legend-pct">
                        {Math.round(dev.value / data.devices.reduce((a,b)=>a+b.value, 0) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Average Session Time Bar Chart */}
        <div className="premium-card mb-0">
          <div className="premium-card-header flex-between">
            <div>
              <h3>Average Session Duration</h3>
              <p className="card-subtitle">Aggregated daily engagement time over the selected period</p>
            </div>
            <div className="avg-time-highlight">
              <span className="time-val">{formatMinSec(data.avgTimeSeconds)}</span>
              <span className="time-unit">avg duration</span>
            </div>
          </div>
          <div className="bar-chart-interactive" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...data.timeByDate].reverse()} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  minTickGap={30}
                  tickFormatter={(val) => val.split(',')[0]} // keep short date
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Bar dataKey="avgTime" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {data.timeByDate.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgTime > data.avgTimeSeconds ? PRIMARY_COLOR : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pages and Store Funnel Row */}
        <div className="premium-2col" style={{ gridTemplateColumns: source === 'all' ? '1fr 1fr' : '1fr' }}>
          {source !== 'storefront' && (
            <div className="premium-card">
              <div className="premium-card-header">
                <h3>Top Performing Pages</h3>
              </div>
              <div className="country-list-interactive">
                {data.topPages.map((p, i) => {
                  const maxVal = data.topPages[0]?.views || 1;
                  const pct = Math.round((p.views / maxVal) * 100);
                  return (
                    <div className="country-row" key={i}>
                      <div className="hover-data">{p.views.toLocaleString()} precise views tracked</div>
                      <div className="country-identity" style={{ width: 'auto', flex: 1 }}>
                        <span className="country-name" style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{p.path}</span>
                      </div>
                      <div className="country-metrics" style={{ flex: 'none', width: '160px' }}>
                        <span className="country-val">{p.views.toLocaleString()}</span>
                        <div className="country-bar-track">
                          <div className="country-bar-fill" style={{ width: `${Math.max(5, pct)}%`, background: 'linear-gradient(90deg, #ec4899, #f43f5e)' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {source !== 'website' && (
            <div className="premium-card">
              <div className="premium-card-header">
                <h3>E-Commerce Sales Funnel</h3>
              </div>
              <div className="country-list-interactive">
                {[
                  { label: "Products Viewed", value: data.storeFunnel.views, color: "#94a3b8" },
                  { label: "Added to Cart", value: data.storeFunnel.add_to_cart, color: "#38bdf8" },
                  { label: "Reached Checkout", value: data.storeFunnel.checkouts, color: "#818cf8" },
                  { label: "Completed Purchase", value: data.storeFunnel.purchases, color: "#10b981" },
                ].map((s, i) => {
                  const maxVal = Math.max(data.storeFunnel.views, 1);
                  const pct = Math.round((s.value / maxVal) * 100);
                  return (
                    <div className="country-row" key={i}>
                      <div className="hover-data">{s.value.toLocaleString()} authentic customer actions</div>
                      <div className="country-identity" style={{ width: 160 }}>
                        <span className="country-name" style={{ fontWeight: 600 }}>{s.label}</span>
                      </div>
                      <div className="country-metrics">
                        <span className="country-val">{s.value.toLocaleString()}</span>
                        <div className="country-bar-track">
                          <div className="country-bar-fill" style={{ width: `${Math.max(5, pct)}%`, background: s.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}

// -------------------------------------------------------------
// Interactive Helper Components
// -------------------------------------------------------------

function getFlag(countryName: string) {
  if (countryName.includes('Kingdom')) return '🇬🇧';
  if (countryName.includes('United States') || countryName.includes('America')) return '🇺🇸';
  if (countryName.includes('Pakistan')) return '🇵🇰';
  if (countryName.includes('Canada')) return '🇨🇦';
  if (countryName.includes('Australia')) return '🇦🇺';
  if (countryName.includes('Germany')) return '🇩🇪';
  if (countryName.includes('France')) return '🇫🇷';
  return '🌍';
}

function StatCard({ title, value, change, icon, sparklineData, dataKey, color }: any) {
  const isUp = change >= 0;
  return (
    <div className="premium-stat-card">
      <div className="stat-card-top">
        <div className="stat-icon-wrapper" style={{ color: color, backgroundColor: `${color}15` }}>
          {icon}
        </div>
        <div className={`stat-badge ${isUp ? 'positive' : 'negative'}`}>
          {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="stat-card-mid">
        <h4 className="stat-card-title">{title}</h4>
        <div className="stat-card-value">{value}</div>
      </div>
      
      <div className="stat-sparkline">
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={[...sparklineData].reverse()}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2} 
              fill={`url(#grad-${dataKey})`} 
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="premium-tooltip glass">
        <p className="pt-label">{payload[0].name}</p>
        <p className="pt-value">{payload[0].value.toLocaleString()} sessions</p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sec = payload[0].value;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    return (
      <div className="premium-tooltip">
        <p className="pt-label">{label}</p>
        <p className="pt-value">{timeStr} Min</p>
      </div>
    );
  }
  return null;
};
