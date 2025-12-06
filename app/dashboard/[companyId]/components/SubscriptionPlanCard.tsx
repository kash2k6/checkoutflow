'use client';

import { Check } from 'lucide-react';
import { Button } from '@whop/react/components';
import FrostedCard from './UpsellFlowBuilder/FrostedCard';

interface SubscriptionPlanCardProps {
  onSubscribe?: () => void;
  isLoading?: boolean;
}

export default function SubscriptionPlanCard({ onSubscribe, isLoading }: SubscriptionPlanCardProps) {
  return (
    <FrostedCard className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-12 dark:text-white mb-2">
          Unlimited Funnels for Your Business
        </h2>
        <p className="text-sm text-gray-10 dark:text-gray-9">
          All features, no limitations
        </p>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6 pb-6 border-b border-gray-a4">
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="text-5xl font-bold text-gray-12 dark:text-white">$49.95</span>
          <span className="text-gray-10 dark:text-gray-9">/month</span>
        </div>
        <p className="text-sm text-gray-9 dark:text-gray-8">7-day free trial, then $49.95/month</p>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-gray-12 dark:text-white mt-0.5 flex-shrink-0" />
          <span className="text-gray-12 dark:text-white text-sm">Unlimited funnel creation</span>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-gray-12 dark:text-white mt-0.5 flex-shrink-0" />
          <span className="text-gray-12 dark:text-white text-sm">All premium features</span>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-gray-12 dark:text-white mt-0.5 flex-shrink-0" />
          <span className="text-gray-12 dark:text-white text-sm">Advanced analytics</span>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-gray-12 dark:text-white mt-0.5 flex-shrink-0" />
          <span className="text-gray-12 dark:text-white text-sm">Priority support</span>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-gray-12 dark:text-white mt-0.5 flex-shrink-0" />
          <span className="text-gray-12 dark:text-white text-sm">No limitations</span>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        onClick={onSubscribe}
        disabled={isLoading}
        color="tomato"
        variant="classic"
        size="3"
        className="w-full"
      >
        {isLoading ? 'Processing...' : 'Subscribe Now'}
      </Button>
    </FrostedCard>
  );
}

