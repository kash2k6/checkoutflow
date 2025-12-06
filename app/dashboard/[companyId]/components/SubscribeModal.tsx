'use client';

import { useState, useEffect } from 'react';
import { useIframeSdk } from '@whop/react/iframe';
import SubscriptionPlanCard from './SubscriptionPlanCard';
import { X } from 'lucide-react';
import { createSubscriptionPurchase } from '@/lib/actions/create-subscription-purchase';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubscribeModal({ isOpen, onClose, onSuccess }: SubscribeModalProps) {
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

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create in-app purchase configuration
      const inAppPurchase = await createSubscriptionPurchase();
      
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
        if (result.status !== 'cancelled') {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-a1/80 dark:bg-gray-a1/80 backdrop-blur-sm">
      <div className="border border-gray-a4 rounded-xl bg-white dark:bg-gray-a2 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-a4">
          <h2 className="text-xl font-semibold text-gray-12 dark:text-white">
            Subscribe to Continue
          </h2>
          <button
            onClick={onClose}
            className="text-gray-10 hover:text-gray-12 dark:text-gray-9 dark:hover:text-gray-10 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <SubscriptionPlanCard
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

