'use client';

import { useState, useEffect } from 'react';
import { useIframeSdk } from '@whop/react/iframe';
import SubscriptionPlanCard from './SubscriptionPlanCard';
import { 
  Dialog,
  Button,
} from '@whop/react/components';
import { createSubscriptionPurchase } from '@/lib/actions/create-subscription-purchase';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentPlanId?: string | null;
}

export default function SubscribeModal({ isOpen, onClose, onSuccess, currentPlanId }: SubscribeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeSdk = useIframeSdk();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create in-app purchase configuration with selected plan ID
      const inAppPurchase = await createSubscriptionPurchase(planId);
      
      if (!inAppPurchase) {
        throw new Error('Failed to create subscription purchase');
      }

      // Open in-app purchase modal using iframe SDK
      const result = await iframeSdk.inAppPurchase(inAppPurchase);

      if (result.status === 'ok') {
        // Purchase successful
        if (onSuccess) {
          onSuccess();
        }
        // Close modal and refresh page to update subscription status
        onClose();
        // Reload page after a short delay to ensure subscription is processed
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Purchase was cancelled or failed
        if (result.status === 'error') {
          setError(result.error || 'Failed to complete purchase');
        }
        // If cancelled, just close without error
      }
    } catch (err) {
      console.error('Error creating subscription purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize purchase');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        size="4" 
        className="max-w-[calc(100vw-2rem)] md:max-w-[90rem] max-h-[95vh] mx-4 md:mx-auto"
      >
        <Dialog.Title className="text-base md:text-lg">Choose Your Plan</Dialog.Title>
        <Dialog.Description className="text-sm md:text-base">Select a plan to unlock more funnels and features</Dialog.Description>

        <div className="flex-1 overflow-y-auto" style={{ marginTop: 'var(--space-4)' }}>
          {error && (
            <div className="mb-4 p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-xs md:text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <SubscriptionPlanCard
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
              currentPlanId={currentPlanId}
            />
          </div>
        </div>

        <div className="flex justify-end" style={{ marginTop: 'var(--space-4)' }}>
          <Button color="gray" variant="soft" onClick={onClose} disabled={isLoading} className="min-h-[44px] touch-manipulation w-full sm:w-auto">Cancel</Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

