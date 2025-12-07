'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const flowId = searchParams.get('flowId');
  const memberId = searchParams.get('memberId');
  const sessionId = searchParams.get('sessionId'); // Session ID to filter by current transaction
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<any>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<Array<{
    name: string;
    price: number;
    type: 'one_time' | 'subscription';
  }>>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!companyId) {
          setError('Missing companyId parameter');
          setLoading(false);
          return;
        }

        // Load flow configuration
        try {
          const flowUrl = flowId 
            ? `/api/flows/${encodeURIComponent(companyId)}?flowId=${encodeURIComponent(flowId)}`
            : `/api/flows/${encodeURIComponent(companyId)}`;
          const flowResponse = await fetch(flowUrl);
          if (flowResponse.ok) {
            const flowData = await flowResponse.json();
            setFlow(flowData);
          } else {
            console.warn('Failed to load flow configuration:', flowResponse.status);
          }
        } catch (err) {
          console.error('Error loading flow:', err);
        }

        // Load purchases from API using memberId
        if (memberId) {
          try {
            const purchasesUrl = `/api/purchases/${encodeURIComponent(companyId)}?memberId=${encodeURIComponent(memberId)}${flowId ? `&flowId=${encodeURIComponent(flowId)}` : ''}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;
            const purchasesResponse = await fetch(purchasesUrl);
            if (purchasesResponse.ok) {
              const purchasesData = await purchasesResponse.json();
              if (purchasesData.purchases && purchasesData.purchases.length > 0) {
                setPurchasedProducts(purchasesData.purchases);
              }
            } else {
              console.warn('Failed to load purchases:', purchasesResponse.status);
            }
          } catch (err) {
            console.error('Error loading purchases:', err);
          }
        }

        // Fallback: Try to get from localStorage (for same-domain redirects)
        if (!memberId && typeof window !== 'undefined') {
          try {
            const storedProducts = localStorage.getItem('purchased_products');
            if (storedProducts) {
              const products = JSON.parse(storedProducts);
              setPurchasedProducts(products);
            }
          } catch (e) {
            console.error('Error parsing stored products:', e);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load confirmation page');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [companyId, flowId, memberId, sessionId]);

  // Facebook Pixel tracking
  useEffect(() => {
    const pixelId = flow?.facebook_pixel_id || (flow?.nodes?.find((n: any) => n.facebook_pixel_id)?.facebook_pixel_id);
    if (pixelId && typeof window !== 'undefined') {
      // Initialize Facebook Pixel
      (window as any).fbq = (window as any).fbq || function() {
        ((window as any).fbq.q = (window as any).fbq.q || []).push(arguments);
      };
      (window as any).fbq.l = +new Date();
      (window as any).fbq('init', pixelId);
      (window as any).fbq('track', 'PageView');
      (window as any).fbq('track', 'Purchase', {
        value: purchasedProducts.reduce((sum, p) => sum + p.price, 0),
        currency: 'USD',
      });
    }
  }, [flow, purchasedProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Error</div>
          <div className="text-white mb-2">{error}</div>
          <div className="text-gray-400 text-sm">
            {companyId && <div>Company ID: {companyId}</div>}
            {flowId && <div>Flow ID: {flowId}</div>}
            {memberId && <div>Member ID: {memberId}</div>}
          </div>
        </div>
      </div>
    );
  }

  const total = purchasedProducts.reduce((sum, product) => sum + product.price, 0);
  const oneTimeProducts = purchasedProducts.filter(p => p.type === 'one_time');
  const subscriptionProducts = purchasedProducts.filter(p => p.type === 'subscription');

  const custom = flow?.confirmation_customization || {};
  const getHeaderTitle = () => {
    if (custom.headerTitle) return custom.headerTitle;
    return `${custom.headerEmoji || '✅'} Order Complete!`;
  };
  const getHeaderSubtitle = () => {
    if (custom.headerSubtitle) return custom.headerSubtitle;
    return 'Thank you for your purchase';
  };
  const getMessageText = () => {
    if (custom.messageText) return custom.messageText;
    return subscriptionProducts.length > 0
      ? `You have ${subscriptionProducts.length} active subscription${subscriptionProducts.length > 1 ? 's' : ''}. All products have been added to your account. Check your email for confirmation details.`
      : 'All products have been added to your account. Check your email for confirmation details.';
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: custom.backgroundColor || '#1a1a1a' }}
    >
      <div 
        className="w-full max-w-2xl border rounded-2xl shadow-xl overflow-hidden"
        style={{ 
          backgroundColor: custom.cardBackgroundColor || '#2a2a2a',
          borderColor: custom.cardBackgroundColor ? 'rgba(255,255,255,0.1)' : '#3a3a3a'
        }}
      >
        {/* Header */}
        <div 
          className="p-6 text-center"
          style={{
            background: `linear-gradient(to right, ${custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}, ${custom.headerGradientEnd || '#0b5940'})`
          }}
        >
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: custom.headerTextColor || '#ffffff' }}
          >
            {getHeaderTitle()}
          </h1>
          <p 
            className="text-sm"
            style={{ color: custom.headerTextColor ? `${custom.headerTextColor}CC` : 'rgba(255, 255, 255, 0.9)' }}
          >
            {getHeaderSubtitle()}
          </p>
        </div>

        {/* Confirmation Content */}
        <div className="p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: custom.textColor || '#ffffff' }}>Your Purchases:</h2>
          
          {purchasedProducts.length > 0 ? (
            <>
              <div className="space-y-4 mb-6">
                {purchasedProducts.map((product, index) => (
                  <div key={index} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-white font-semibold">{product.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {product.type === 'subscription' ? 'Subscription (Monthly)' : 'One-time Purchase'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#3a3a3a] pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold" style={{ color: custom.textColor || '#ffffff' }}>Total:</span>
                  <span className="text-2xl font-bold" style={{ color: custom.primaryColor || '#0D6B4D' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-6">
              <p style={{ color: custom.textColor ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>Your order has been processed successfully.</p>
            </div>
          )}

          <div 
            className="border rounded-lg p-4 mb-6"
            style={{
              backgroundColor: `${custom.primaryColor || '#0D6B4D'}20`,
              borderColor: `${custom.primaryColor || '#0D6B4D'}40`
            }}
          >
            <p className="text-sm" style={{ color: custom.primaryColor || '#0D6B4D' }}>
              {getMessageText()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}

