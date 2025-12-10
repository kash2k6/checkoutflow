'use client';

import { useState, useEffect } from 'react';
import { Button } from '@whop/react/components';
import DashboardTabs from './DashboardTabs';
import SubscribeModal from './SubscribeModal';

interface DashboardWithSubscriptionProps {
  companyId: string;
}

export default function DashboardWithSubscription({ companyId }: DashboardWithSubscriptionProps) {
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/check');
      if (response.ok) {
        const data = await response.json();
        setHasSubscription(data.hasAccess);
      } else {
        // On error, assume no subscription (fail closed)
        console.error('Failed to check subscription:', response.status);
        setHasSubscription(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // On error, assume no subscription (fail closed)
      setHasSubscription(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    setHasSubscription(true);
    setShowModal(false);
    // Refresh subscription status
    checkSubscription();
  };

  return (
    <>
      {/* Show subscription banner if user doesn't have subscription */}
      {!isLoading && !hasSubscription && (
        <div className="sticky top-0 z-[60] bg-white/95 dark:bg-gray-a2/95 backdrop-blur-sm border-b border-gray-a4 overflow-hidden">
          <div className="w-full px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 max-w-7xl mx-auto">
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-semibold text-sm sm:text-base text-gray-12 mb-1 truncate">
                  Subscription Required
                </p>
                <p className="text-xs sm:text-sm text-gray-10 break-words">
                  Subscribe to enable your funnels and access all features. You can still set up your funnels now.
                </p>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                color="tomato"
                variant="classic"
                size="2"
                className="w-full sm:w-auto min-h-[44px] touch-manipulation flex-shrink-0"
              >
                Subscribe Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Always show dashboard - users can set up funnels */}
      <DashboardTabs companyId={companyId} hasSubscription={hasSubscription} />
      
      {/* Subscription Modal */}
      <SubscribeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSubscriptionSuccess}
      />
    </>
  );
}

