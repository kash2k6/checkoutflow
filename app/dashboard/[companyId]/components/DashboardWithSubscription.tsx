'use client';

import DashboardTabs from './DashboardTabs';

interface DashboardWithSubscriptionProps {
  companyId: string;
}

export default function DashboardWithSubscription({ companyId }: DashboardWithSubscriptionProps) {
  return (
    <DashboardTabs companyId={companyId} />
  );
}

