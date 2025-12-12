'use client';

import { Button } from '@whop/react/components';
import { STARTER_PLAN_ID, GROWTH_PLAN_ID, PRO_PLAN_ID } from '@/lib/subscription-constants';

interface SubscriptionPlanCardProps {
  onSubscribe?: (planId: string) => void;
  isLoading?: boolean;
  currentPlanId?: string | null;
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

export default function SubscriptionPlanCard({ onSubscribe, isLoading, currentPlanId }: SubscriptionPlanCardProps) {
  const handleSubscribe = (plan: PlanTier) => {
    if (plan.planId && onSubscribe) {
      onSubscribe(plan.planId);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-12 dark:text-white mb-2">
          Choose Your Plan
        </h2>
        <p className="text-sm md:text-base text-gray-10 dark:text-gray-9">
          Select the plan that fits your business needs
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="space-y-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.planId === currentPlanId;
            const isFree = plan.planId === null;
            const isPaid = !isFree;

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
                      disabled={isLoading || isCurrentPlan}
                      color={plan.popular ? 'tomato' : 'gray'}
                      variant={isCurrentPlan ? 'soft' : 'classic'}
                      size="3"
                      className="min-w-[120px] min-h-[44px] touch-manipulation"
                    >
                      {isLoading
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
    </div>
  );
}
