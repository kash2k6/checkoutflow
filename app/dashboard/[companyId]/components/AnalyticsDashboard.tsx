'use client';

import { useEffect, useState } from 'react';

interface FlowAnalytics {
  flow_id: string;
  flow_name: string;
  visits: {
    total: number;
    checkout: number;
    upsell: number;
    downsell: number;
    cross_sell: number;
    confirmation: number;
  };
  purchases: {
    total: number;
    by_type: {
      initial: number;
      upsell: number;
      downsell: number;
      cross_sell: number;
    };
    revenue: number;
  };
  conversion_rate: number;
}

interface AnalyticsSummary {
  total_flows: number;
  total_visits: number;
  total_purchases: number;
  total_revenue: number;
  average_conversion_rate: string;
}

export default function AnalyticsDashboard({ companyId }: { companyId: string }) {
  const [analytics, setAnalytics] = useState<FlowAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const startDate = dateRange === 'all' 
          ? null 
          : new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString();
        
        let url = `/api/analytics/${companyId}`;
        if (selectedFlowId) url += `?flowId=${selectedFlowId}`;
        if (startDate) url += `${selectedFlowId ? '&' : '?'}startDate=${startDate}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics || []);
          setSummary(data.summary || null);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [companyId, selectedFlowId, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
          <div className="text-gray-12 text-lg font-medium">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-10">Track visits, purchases, and conversion rates for your funnels</p>
      </div>

      {/* Filters */}
      <div className="border border-gray-a4 rounded-xl p-5 bg-white dark:bg-gray-a2 flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-12">
          Date Range:
        </label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
          className="px-3 py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a3 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <label className="text-sm font-medium text-gray-12">
          Filter by Flow:
        </label>
        <select
          value={selectedFlowId || ''}
          onChange={(e) => setSelectedFlowId(e.target.value || null)}
          className="flex-1 px-3 py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a3 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent min-w-[200px]"
        >
          <option value="">All Flows</option>
          {analytics.map(a => (
            <option key={a.flow_id} value={a.flow_id}>{a.flow_name}</option>
          ))}
        </select>
      </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-a4 rounded-xl p-6 bg-white dark:bg-gray-a2">
              <div className="text-gray-10 text-sm mb-2 font-medium">Total Visits</div>
              <div className="text-3xl font-bold text-gray-12">{summary.total_visits.toLocaleString()}</div>
            </div>
            <div className="modern-card p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-2 font-medium">Total Purchases</div>
              <div className="text-4xl font-bold text-white">{summary.total_purchases.toLocaleString()}</div>
            </div>
            <div className="modern-card p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-green-light/20 flex items-center justify-center border border-accent-green/30">
                  <svg className="w-6 h-6 text-accent-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-2 font-medium">Total Revenue</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-accent-green to-accent-green-light bg-clip-text text-transparent">
                ${summary.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="modern-card p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-sm mb-2 font-medium">Avg Conversion Rate</div>
              <div className="text-4xl font-bold text-white">{summary.average_conversion_rate}%</div>
            </div>
          </div>
        )}

        {/* Flow Analytics */}
        <div className="space-y-4">
          {analytics.map((flow, idx) => (
            <div key={flow.flow_id} className="border border-gray-a4 rounded-xl p-6 bg-white dark:bg-gray-a2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-12">{flow.flow_name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-12">
                    ${flow.purchases.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-10 font-medium">Revenue</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="border border-gray-a4 rounded-lg p-4 bg-gray-a1">
                  <div className="text-gray-10 text-xs mb-2 font-medium uppercase tracking-wide">Checkout Visits</div>
                  <div className="text-xl font-bold text-gray-12">{flow.visits.checkout.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-4 bg-gray-a1">
                  <div className="text-gray-10 text-xs mb-2 font-medium uppercase tracking-wide">Initial Purchases</div>
                  <div className="text-xl font-bold text-gray-12">{flow.purchases.by_type.initial.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-4 bg-gray-a1">
                  <div className="text-gray-10 text-xs mb-2 font-medium uppercase tracking-wide">Upsells</div>
                  <div className="text-xl font-bold text-gray-12">{flow.purchases.by_type.upsell.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-4 bg-gray-a1">
                  <div className="text-gray-10 text-xs mb-2 font-medium uppercase tracking-wide">Downsells</div>
                  <div className="text-xl font-bold text-gray-12">{flow.purchases.by_type.downsell.toLocaleString()}</div>
                </div>
                <div className="border border-accent-500/30 rounded-lg p-4 bg-accent-500/10">
                  <div className="text-accent-500 text-xs mb-2 font-medium uppercase tracking-wide">Conversion Rate</div>
                  <div className="text-xl font-bold text-accent-500">{flow.conversion_rate}%</div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="mt-6 pt-6 border-t border-gray-a4">
                <div className="text-gray-12 text-sm mb-4 font-semibold">
                  Conversion Funnel
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-10 font-medium">Checkout</div>
                    <div className="flex-1 bg-gray-a1 rounded-lg h-8 relative overflow-hidden">
                      <div 
                        className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-3 text-xs text-gray-12 font-bold">
                        {flow.visits.checkout.toLocaleString()} visits
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-10 font-medium">Purchase</div>
                    <div className="flex-1 bg-gray-a1 rounded-lg h-8 relative overflow-hidden">
                      <div 
                        className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                        style={{ width: `${flow.visits.checkout > 0 ? Math.min((flow.purchases.by_type.initial / flow.visits.checkout * 100), 100) : 0}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-3 text-xs text-gray-12 font-bold">
                        {flow.purchases.by_type.initial.toLocaleString()} ({flow.conversion_rate}%)
                      </div>
                    </div>
                  </div>
                  {flow.purchases.by_type.upsell > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-24 text-xs text-gray-10 font-medium">Upsells</div>
                      <div className="flex-1 bg-gray-a1 rounded-lg h-8 relative overflow-hidden">
                        <div 
                          className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                          style={{ width: `${flow.purchases.by_type.initial > 0 ? Math.min((flow.purchases.by_type.upsell / flow.purchases.by_type.initial * 100), 100) : 0}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-3 text-xs text-gray-12 font-bold">
                          {flow.purchases.by_type.upsell.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {analytics.length === 0 && (
            <div className="border border-gray-a4 rounded-xl p-12 bg-white dark:bg-gray-a2 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-12 mb-3">No Analytics Data Yet</h2>
                <p className="text-gray-10 leading-relaxed">
                  Start creating flows and driving traffic to see metrics here.
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

