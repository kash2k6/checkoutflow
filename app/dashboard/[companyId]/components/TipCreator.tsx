'use client';

import { useState } from 'react';
import { Heart, CreditCard } from 'lucide-react';
import { Button } from '@whop/react/components';
import { useIframeSdk } from '@whop/react/iframe';
import { createSubscriptionPurchase } from '@/lib/actions/create-subscription-purchase';

interface TipCreatorProps {
  companyId: string;
}

const SUGGESTED_AMOUNTS = [5, 10, 25, 50, 100];
const TIP_COMPANY_ID = 'biz_PHQfLZ3o2GvXQn'; // Tips always go to this business ID

export default function TipCreator({ companyId }: TipCreatorProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeSdk = useIframeSdk();

  const handleAmountSelect = async (amount: number) => {
    await processTip(amount);
  };

  const handleCustomAmount = async () => {
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount > 0) {
      setCustomAmount('');
      await processTip(amount);
    } else {
      setError('Please enter a valid amount greater than 0');
    }
  };

  const processTip = async (amount: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user email from localStorage if available
      const userData = localStorage.getItem('xperience_user_data');
      const userEmail = userData ? JSON.parse(userData).email : null;

      // Create checkout configuration for tip (one-time payment)
      const response = await fetch('/api/whop/checkout-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: `tip_${amount}`, // Store amount in planId for reference
          userEmail,
          companyId: TIP_COMPANY_ID, // Tips always go to the main business ID
          tipAmount: amount, // Pass tip amount in metadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout configuration');
      }

      const data = await response.json();

      // Use in-app purchase modal instead of iframe checkout
      if (!iframeSdk) {
        throw new Error('Iframe SDK not available');
      }

      const result = await iframeSdk.inAppPurchase({
        planId: data.planId, // Use the plan ID from the created plan
        id: data.checkoutConfigId,
      });

      if (result.status === 'ok') {
        // Payment successful
        alert(`Thank you for your $${amount.toFixed(2)} tip!`);
        setSelectedAmount(null);
      } else if (result.status === 'error') {
        setError(result.error || 'Payment failed');
      }
      // If cancelled, just reset without error
    } catch (err) {
      console.error('Error processing tip:', err);
      setError(err instanceof Error ? err.message : 'Failed to process tip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create in-app purchase configuration for subscription
      const inAppPurchase = await createSubscriptionPurchase();
      
      if (!inAppPurchase) {
        throw new Error('Failed to create subscription purchase');
      }

      if (!iframeSdk) {
        throw new Error('Iframe SDK not available');
      }

      // Open in-app purchase modal using iframe SDK
      const result = await iframeSdk.inAppPurchase(inAppPurchase);

      if (result.status === 'ok') {
        // Subscription successful
        alert('Thank you for subscribing! Your subscription is now active.');
      } else if (result.status === 'error') {
        setError(result.error || 'Failed to complete subscription');
      }
      // If cancelled, just reset without error
    } catch (err) {
      console.error('Error creating subscription purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-12">Tip Creator</h1>
        </div>
        <p className="text-gray-10 text-sm md:text-base">
          Tip one-time or subscribe monthly to support the creator
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Tip Amount Selection */}
      {!isLoading && (
        <div className="bg-white dark:bg-gray-a2 rounded-lg border border-gray-a4 p-4 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <h2 className="text-lg font-semibold text-gray-12">One-Time Tip</h2>
          </div>
          <p className="text-gray-10 text-sm mb-4">Select an amount to tip:</p>
          
          {/* Suggested Amounts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {SUGGESTED_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                disabled={isLoading}
                className="px-4 py-3 bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-semibold rounded-lg border border-accent-200 dark:border-accent-800 transition-colors min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomAmount();
                }
              }}
              placeholder="Enter custom amount"
              min="0.01"
              step="0.01"
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a1 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
            />
            <Button
              onClick={handleCustomAmount}
              color="tomato"
              variant="classic"
              size="2"
              disabled={!customAmount || parseFloat(customAmount) <= 0 || isLoading}
              className="min-h-[44px] touch-manipulation"
            >
              Use
            </Button>
          </div>
        </div>
      )}

      {/* Subscription Section */}
      {!isLoading && (
        <div className="bg-white dark:bg-gray-a2 rounded-lg border border-gray-a4 p-4 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <h2 className="text-lg font-semibold text-gray-12">Monthly Subscription</h2>
          </div>
          <p className="text-gray-10 text-sm mb-4">
            Subscribe monthly to support the creator on an ongoing basis
          </p>
          <Button
            onClick={handleSubscribe}
            color="tomato"
            variant="classic"
            size="3"
            disabled={isLoading}
            className="w-full min-h-[44px] touch-manipulation"
          >
            Subscribe Monthly
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-a2 rounded-lg border border-gray-a4 p-4 md:p-6 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent-600 border-t-transparent"></div>
          </div>
          <p className="text-gray-10 text-sm">Opening payment modal...</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How to Use</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span><strong>One-Time Tip:</strong> Select a suggested amount or enter a custom amount to tip once</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span><strong>Monthly Subscription:</strong> Click "Subscribe Monthly" to set up recurring monthly support</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Complete the payment in the modal that opens - your payment will be processed automatically</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

