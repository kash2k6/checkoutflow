'use client';

import { useState } from 'react';
import FlowBuilder from './FlowBuilder';
import AnalyticsDashboard from './AnalyticsDashboard';
import TipCreator from './TipCreator';
import { LayoutDashboard, BarChart3, Heart } from 'lucide-react';

export default function DashboardTabs({ 
  companyId,
}: { 
  companyId: string;
}) {
  const [activeTab, setActiveTab] = useState<'flows' | 'analytics' | 'tip'>('flows');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-a1 dark:via-gray-a2 dark:to-gray-a1">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-a2 border-b border-gray-a4">
        <div className="w-full px-2 sm:px-4 md:px-6">
          <div className="flex items-center gap-1 sm:gap-2 h-12 sm:h-14 md:h-16 w-full">
            <button
              onClick={() => setActiveTab('flows')}
              className={`
                relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation
                ${activeTab === 'flows'
                  ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                  : 'text-gray-10 hover:text-gray-12 hover:bg-gray-a3'
                }
              `}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Flow Builder</span>
              {activeTab === 'flows' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`
                relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation
                ${activeTab === 'analytics'
                  ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                  : 'text-gray-10 hover:text-gray-12 hover:bg-gray-a3'
                }
              `}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Analytics</span>
              {activeTab === 'analytics' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('tip')}
              className={`
                relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation
                ${activeTab === 'tip'
                  ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                  : 'text-gray-10 hover:text-gray-12 hover:bg-gray-a3'
                }
              `}
            >
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Tip Creator</span>
              {activeTab === 'tip' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {activeTab === 'flows' && <FlowBuilder companyId={companyId} />}
        {activeTab === 'analytics' && <AnalyticsDashboard companyId={companyId} />}
        {activeTab === 'tip' && <TipCreator companyId={companyId} />}
      </div>
    </div>
  );
}

