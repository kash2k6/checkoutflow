'use client';

import { useState, useEffect } from 'react';
import { Button } from '@whop/react/components';
import { useIframeSdk } from '@whop/react/iframe';
import { createSubscriptionPurchase } from '@/lib/actions/create-subscription-purchase';
import { STARTER_PLAN_ID, GROWTH_PLAN_ID, PRO_PLAN_ID } from '@/lib/subscription-constants';

interface SubscriptionProps {
  companyId: string;
}

interface PlanTier {
  id: string;
  name: string;
  price: string;
  priceLabel: string;
  funnelLimit: number | null; // null means unlimited
  popular?: boolean;
  planId: string | null; // null for free tier
}

const PLANS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceLabel: 'Forever free',
    funnelLimit: 1,
    planId: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$19.95',
    priceLabel: '/month',
    funnelLimit: 3,
    planId: STARTER_PLAN_ID,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$34.95',
    priceLabel: '/month',
    funnelLimit: 10,
    popular: true,
    planId: GROWTH_PLAN_ID,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49.95',
    priceLabel: '/month',
    funnelLimit: null,
    planId: PRO_PLAN_ID,
  },
];

export default function Subscription({ companyId }: SubscriptionProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null); // Track which plan is loading
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const iframeSdk = useIframeSdk();

  // Load current subscription plan ID on mount
  useEffect(() => {
    fetch('/api/subscription/check')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.planId) {
          setCurrentPlanId(data.planId);
        }
      })
      .catch(err => {
        console.error('Error fetching subscription status:', err);
      });
  }, []);

  const handleSubscribe = async (plan: PlanTier) => {
    if (!plan.planId) return; // Free tier, no action needed

    setIsLoading(plan.id);
    setError(null);

    try {
      // Create in-app purchase configuration with selected plan ID
      const inAppPurchase = await createSubscriptionPurchase(plan.planId);
      
      if (!inAppPurchase) {
        throw new Error('Failed to create subscription purchase');
      }

      if (!iframeSdk) {
        throw new Error('Iframe SDK not available');
      }

      // Open in-app purchase modal using iframe SDK
      const result = await iframeSdk.inAppPurchase(inAppPurchase);

      if (result.status === 'ok') {
        // Purchase successful - reload subscription status
        const subscriptionResponse = await fetch('/api/subscription/check');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setCurrentPlanId(subscriptionData.planId || null);
        }
        // Reload page after a short delay to ensure subscription is processed
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else if (result.status === 'error') {
        setError(result.error || 'Failed to complete purchase');
      }
      // If cancelled, just reset without error
    } catch (err) {
      console.error('Error creating subscription purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize purchase');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-12 dark:text-white mb-2">
          Subscription Plans
        </h2>
        <p className="text-sm md:text-base text-gray-10 dark:text-gray-9">
          Choose the plan that fits your business needs
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.planId === currentPlanId;
          const isFree = plan.planId === null;
          const isPaid = !isFree;
          const isProcessing = isLoading === plan.id;

          return (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-4 md:p-6 rounded-lg border-2 transition-all ${
                plan.popular
                  ? 'border-tomato-9 bg-tomato-2 dark:bg-tomato-3'
                  : isCurrentPlan
                  ? 'border-green-9 bg-green-2 dark:bg-green-3'
                  : 'border-gray-a4 bg-gray-a2 dark:bg-gray-a3'
              }`}
            >
              <div className="flex items-center gap-4 md:gap-6 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-12 dark:text-white">
                      {plan.name}
                    </h3>
                    {plan.popular && (
                      <span className="bg-tomato-9 text-white text-xs font-semibold px-2 py-1 rounded">
                        Most Popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="bg-green-9 text-white text-xs font-semibold px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-bold text-gray-12 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-10 dark:text-gray-9 text-sm md:text-base">
                      {plan.priceLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base md:text-lg font-semibold text-gray-12 dark:text-white">
                    {plan.funnelLimit === null
                      ? 'Unlimited funnels'
                      : `${plan.funnelLimit} funnel${plan.funnelLimit === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <div className="ml-4 md:ml-6">
                {isFree ? (
                  <span className="text-sm text-gray-9 dark:text-gray-8 px-4 py-2">
                    Current Plan
                  </span>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing || isCurrentPlan}
                    color={plan.popular ? 'tomato' : 'gray'}
                    variant={isCurrentPlan ? 'soft' : 'classic'}
                    size="3"
                    className="min-w-[120px] min-h-[44px] touch-manipulation"
                  >
                    {isProcessing
                      ? 'Processing...'
                      : isCurrentPlan
                      ? 'Current Plan'
                      : isPaid && currentPlanId
                      ? 'Upgrade'
                      : 'Subscribe'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

