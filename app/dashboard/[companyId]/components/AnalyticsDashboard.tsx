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
      <div className="flex items-center justify-center py-8 md:py-12">
        <div className="text-center px-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
          <div className="text-gray-12 text-base md:text-lg font-medium">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-12 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-10 text-sm md:text-base">Track visits, purchases, and conversion rates for your funnels</p>
      </div>

      {/* Filters */}
      <div className="border border-gray-a4 rounded-xl p-4 md:p-5 bg-white dark:bg-gray-a2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <label className="text-sm font-medium text-gray-12 whitespace-nowrap">
          Date Range:
        </label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'all')}
          className="w-full sm:w-auto px-3 py-2.5 md:py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a3 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent min-h-[44px] text-base md:text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <label className="text-sm font-medium text-gray-12 whitespace-nowrap">
          Filter by Flow:
        </label>
        <select
          value={selectedFlowId || ''}
          onChange={(e) => setSelectedFlowId(e.target.value || null)}
          className="w-full sm:flex-1 px-3 py-2.5 md:py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a3 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent min-w-[200px] min-h-[44px] text-base md:text-sm"
        >
          <option value="">All Flows</option>
          {analytics.map(a => (
            <option key={a.flow_id} value={a.flow_id}>{a.flow_name}</option>
          ))}
        </select>
      </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="border border-gray-a4 rounded-xl p-4 md:p-6 bg-white dark:bg-gray-a2">
              <div className="text-gray-10 text-xs md:text-sm mb-2 font-medium">Total Visits</div>
              <div className="text-2xl md:text-3xl font-bold text-gray-12">{summary.total_visits.toLocaleString()}</div>
            </div>
            <div className="modern-card p-4 md:p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">Total Purchases</div>
              <div className="text-3xl md:text-4xl font-bold text-white">{summary.total_purchases.toLocaleString()}</div>
            </div>
            <div className="modern-card p-4 md:p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-green-light/20 flex items-center justify-center border border-accent-green/30">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-accent-green-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">Total Revenue</div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-green to-accent-green-light bg-clip-text text-transparent">
                ${summary.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="modern-card p-4 md:p-6 animate-slide-up group hover:border-accent-green/40 transition-all" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">Avg Conversion Rate</div>
              <div className="text-3xl md:text-4xl font-bold text-white">{summary.average_conversion_rate}%</div>
            </div>
          </div>
        )}

        {/* Flow Analytics */}
        <div className="space-y-3 md:space-y-4">
          {analytics.map((flow, idx) => (
            <div key={flow.flow_id} className="border border-gray-a4 rounded-xl p-4 md:p-6 bg-white dark:bg-gray-a2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-12 truncate">{flow.flow_name}</h2>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-xl md:text-2xl font-bold text-gray-12">
                    ${flow.purchases.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs md:text-sm text-gray-10 font-medium">Revenue</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="border border-gray-a4 rounded-lg p-3 md:p-4 bg-gray-a1">
                  <div className="text-gray-10 text-[10px] md:text-xs mb-1 md:mb-2 font-medium uppercase tracking-wide">Checkout Visits</div>
                  <div className="text-lg md:text-xl font-bold text-gray-12">{flow.visits.checkout.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-3 md:p-4 bg-gray-a1">
                  <div className="text-gray-10 text-[10px] md:text-xs mb-1 md:mb-2 font-medium uppercase tracking-wide">Initial Purchases</div>
                  <div className="text-lg md:text-xl font-bold text-gray-12">{flow.purchases.by_type.initial.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-3 md:p-4 bg-gray-a1">
                  <div className="text-gray-10 text-[10px] md:text-xs mb-1 md:mb-2 font-medium uppercase tracking-wide">Upsells</div>
                  <div className="text-lg md:text-xl font-bold text-gray-12">{flow.purchases.by_type.upsell.toLocaleString()}</div>
                </div>
                <div className="border border-gray-a4 rounded-lg p-3 md:p-4 bg-gray-a1">
                  <div className="text-gray-10 text-[10px] md:text-xs mb-1 md:mb-2 font-medium uppercase tracking-wide">Downsells</div>
                  <div className="text-lg md:text-xl font-bold text-gray-12">{flow.purchases.by_type.downsell.toLocaleString()}</div>
                </div>
                <div className="border border-accent-500/30 rounded-lg p-3 md:p-4 bg-accent-500/10 col-span-2 md:col-span-1">
                  <div className="text-accent-500 text-[10px] md:text-xs mb-1 md:mb-2 font-medium uppercase tracking-wide">Conversion Rate</div>
                  <div className="text-lg md:text-xl font-bold text-accent-500">{flow.conversion_rate}%</div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-a4">
                <div className="text-gray-12 text-xs md:text-sm mb-3 md:mb-4 font-semibold">
                  Conversion Funnel
                </div>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-16 md:w-24 text-[10px] md:text-xs text-gray-10 font-medium flex-shrink-0">Checkout</div>
                    <div className="flex-1 bg-gray-a1 rounded-lg h-7 md:h-8 relative overflow-hidden min-w-0">
                      <div 
                        className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-2 md:pr-3 text-[10px] md:text-xs text-gray-12 font-bold">
                        <span className="truncate">{flow.visits.checkout.toLocaleString()} visits</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-16 md:w-24 text-[10px] md:text-xs text-gray-10 font-medium flex-shrink-0">Purchase</div>
                    <div className="flex-1 bg-gray-a1 rounded-lg h-7 md:h-8 relative overflow-hidden min-w-0">
                      <div 
                        className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                        style={{ width: `${flow.visits.checkout > 0 ? Math.min((flow.purchases.by_type.initial / flow.visits.checkout * 100), 100) : 0}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-end pr-2 md:pr-3 text-[10px] md:text-xs text-gray-12 font-bold">
                        <span className="truncate">{flow.purchases.by_type.initial.toLocaleString()} ({flow.conversion_rate}%)</span>
                      </div>
                    </div>
                  </div>
                  {flow.purchases.by_type.upsell > 0 && (
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-16 md:w-24 text-[10px] md:text-xs text-gray-10 font-medium flex-shrink-0">Upsells</div>
                      <div className="flex-1 bg-gray-a1 rounded-lg h-7 md:h-8 relative overflow-hidden min-w-0">
                        <div 
                          className="bg-accent-500 h-full rounded-lg transition-all duration-500"
                          style={{ width: `${flow.purchases.by_type.initial > 0 ? Math.min((flow.purchases.by_type.upsell / flow.purchases.by_type.initial * 100), 100) : 0}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2 md:pr-3 text-[10px] md:text-xs text-gray-12 font-bold">
                          <span className="truncate">{flow.purchases.by_type.upsell.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {analytics.length === 0 && (
            <div className="border border-gray-a4 rounded-xl p-6 md:p-12 bg-white dark:bg-gray-a2 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-4xl md:text-6xl mb-4">📊</div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-12 mb-3">No Analytics Data Yet</h2>
                <p className="text-gray-10 leading-relaxed text-sm md:text-base">
                  Start creating flows and driving traffic to see metrics here.
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

