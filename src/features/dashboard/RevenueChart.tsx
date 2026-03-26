import { useState, useEffect } from 'react';
import { fetchAnalyticsData } from '@/services/analytics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const SUCCESS_COLOR = '#10b981';

export function RevenueChart() {
  const [data, setData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAnalyticsData(days, 'all')
      .then((res) => {
        if (!mounted) return;
        // The data in res.revenueByDate is chronological (oldest to newest)
        setData(res.revenueByDate);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch revenue analytics for dashboard:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [days]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{label}</p>
          <p style={{ margin: 0, color: SUCCESS_COLOR, fontWeight: 500 }}>
            Revenue: £{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Date Filters */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px', marginBottom: 8, gap: 8 }}>
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${days === d ? SUCCESS_COLOR : '#e2e8f0'}`,
              background: days === d ? `${SUCCESS_COLOR}10` : '#fff',
              color: days === d ? SUCCESS_COLOR : '#64748b',
              cursor: 'pointer',
              fontWeight: days === d ? 600 : 500,
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            {d} Days
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div style={{ width: '100%', height: 300, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            <div style={{ border: '3px solid rgba(0,0,0,0.1)', borderTopColor: SUCCESS_COLOR, borderRadius: '50%', width: 24, height: 24, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && data.length === 0 ? (
          <div className="dashboard-panel-placeholder" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No revenue data available for the last {days} days.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SUCCESS_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SUCCESS_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                tickMargin={12}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `£${value}`}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke={SUCCESS_COLOR} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
