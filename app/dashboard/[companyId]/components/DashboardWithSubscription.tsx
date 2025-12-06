'use client';

import { useState, useEffect } from 'react';
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
        <div className="border-b border-gray-a4 bg-white dark:bg-gray-a2 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex-1">
              <p className="font-semibold text-base text-gray-12 dark:text-white mb-1">
                Subscription Required
              </p>
              <p className="text-sm text-gray-10 dark:text-gray-9">
                Subscribe to enable your funnels and access all features. You can still set up your funnels now.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="ml-4 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a2 text-gray-12 dark:text-white hover:bg-gray-a3 dark:hover:bg-gray-a3 font-semibold py-2.5 px-6 transition-colors text-sm whitespace-nowrap shadow-sm"
            >
              Subscribe Now
            </button>
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

