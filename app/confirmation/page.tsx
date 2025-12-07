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
    console.log('Confirmation page loading with params:', { companyId, flowId, memberId, sessionId });
    console.log('Window location:', window.location.href);
    console.log('Is in iframe:', window.self !== window.top);
    
    const loadData = async () => {
      try {
        // Load flow configuration if companyId is provided
        if (companyId) {
          try {
            const flowUrl = flowId 
              ? `/api/flows/${companyId}?flowId=${flowId}`
              : `/api/flows/${companyId}`;
            console.log('Fetching flow from:', flowUrl);
            const flowResponse = await fetch(flowUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'omit',
            });
            console.log('Flow response status:', flowResponse.status);
            if (flowResponse.ok) {
              const flowData = await flowResponse.json();
              console.log('Flow data loaded:', !!flowData);
              setFlow(flowData);
            } else {
              console.warn('Flow API returned non-OK status:', flowResponse.status, flowResponse.statusText);
            }
          } catch (e) {
            console.error('Error loading flow:', e);
            // Don't set error state - page should still render
          }

          // Load purchases from API using memberId
          if (memberId) {
            try {
              const purchasesUrl = `/api/purchases/${companyId}?memberId=${encodeURIComponent(memberId)}${flowId ? `&flowId=${flowId}` : ''}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;
              console.log('Fetching purchases from:', purchasesUrl);
              const purchasesResponse = await fetch(purchasesUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'omit', // Don't send cookies in cross-origin requests
              });
              console.log('Purchases response status:', purchasesResponse.status);
              
              if (purchasesResponse.ok) {
                const purchasesData = await purchasesResponse.json();
                console.log('Purchases data loaded:', purchasesData.purchases?.length || 0, 'items');
                if (purchasesData.purchases && purchasesData.purchases.length > 0) {
                  setPurchasedProducts(purchasesData.purchases);
                  setLoading(false);
                  return; // Exit early if we got products from API
                }
              } else {
                const errorText = await purchasesResponse.text();
                console.warn('Purchases API returned non-OK status:', purchasesResponse.status, errorText);
              }
            } catch (e) {
              console.error('Error loading purchases (may be CORS issue):', e);
              // Continue to try localStorage fallback
            }
          }
        }

        // Fallback: Try to get from localStorage (for same-domain redirects)
        // This works even without companyId
        // Check localStorage if we don't have memberId or didn't get products from API
        // Note: localStorage may not be accessible in cross-origin iframes
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const storedProducts = localStorage.getItem('purchased_products');
            if (storedProducts) {
              const products = JSON.parse(storedProducts);
              if (Array.isArray(products) && products.length > 0) {
                setPurchasedProducts(products);
              }
            }
          }
        } catch (e) {
          // localStorage access might be blocked in cross-origin iframes - that's okay
          console.warn('Could not access localStorage (may be cross-origin iframe):', e);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        // Only set error if it's critical (no companyId and no way to show anything)
        if (!companyId && !memberId) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        console.log('Confirmation page finished loading, products:', purchasedProducts.length);
        console.log('Flow loaded:', !!flow);
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

  // Show error message to user if there's a critical error
  if (error && !companyId) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">⚠️ Error Loading Page</div>
          <div className="text-white text-sm mb-4">{error}</div>
          <div className="text-gray-400 text-xs">
            Please check the URL parameters or contact support.
          </div>
        </div>
      </div>
    );
  }

  const total = purchasedProducts.length > 0 
    ? purchasedProducts.reduce((sum, product) => sum + product.price, 0)
    : 0;
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

  // Log diagnostic info for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Confirmation page render diagnostics:', {
        inIframe: window.self !== window.top,
        parentOrigin: window.self !== window.top ? document.referrer : 'same-origin',
        currentOrigin: window.location.origin,
        hasCompanyId: !!companyId,
        hasFlowId: !!flowId,
        hasMemberId: !!memberId,
        productsCount: purchasedProducts.length,
        hasFlow: !!flow,
        loading: loading,
        error: error,
      });
    }
  }, [companyId, flowId, memberId, purchasedProducts.length, flow, loading, error]);

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

