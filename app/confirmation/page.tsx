'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const flowId = searchParams.get('flowId');
  const memberId = searchParams.get('memberId');
  const sessionIdFromUrl = searchParams.get('sessionId'); // Session ID to filter by current transaction
  const nodeId = searchParams.get('nodeId'); // Check for nodeId - should not be on confirmation page
  
  // Get sessionId from URL or sessionStorage (fallback for cross-domain redirects)
  const getSessionId = (): string | null => {
    if (sessionIdFromUrl) return sessionIdFromUrl;
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('flow_session_id');
      if (stored) return stored;
    }
    return null;
  };
  
  const sessionId = getSessionId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<any>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<Array<{
    name: string;
    price: number;
    type: 'one_time' | 'subscription';
  }>>([]);

  // If nodeId is present, this should be an upsell page, not confirmation
  // Redirect to upsell page if nodeId is present (someone accidentally navigated here with nodeId)
  useEffect(() => {
    if (nodeId && typeof window !== 'undefined' && companyId && flowId) {
      console.warn('Confirmation page received nodeId parameter. Redirecting to upsell page...');
      // Redirect to upsell page with the nodeId
      const upsellUrl = new URL('/upsell', window.location.origin);
      upsellUrl.searchParams.set('companyId', companyId);
      upsellUrl.searchParams.set('flowId', flowId);
      upsellUrl.searchParams.set('nodeId', nodeId);
      if (memberId) {
        upsellUrl.searchParams.set('memberId', memberId);
      }
      if (sessionId) {
        upsellUrl.searchParams.set('sessionId', sessionId);
      }
      // Use replace instead of assign to avoid adding to history
      window.location.replace(upsellUrl.toString());
      return;
    }
  }, [nodeId, companyId, flowId, memberId, sessionId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load flow configuration if companyId is provided
        if (companyId) {
          try {
            const flowUrl = flowId 
              ? `/api/flows/${companyId}?flowId=${flowId}`
              : `/api/flows/${companyId}`;
            const flowResponse = await fetch(flowUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'omit',
            });
            if (flowResponse.ok) {
              const flowData = await flowResponse.json();
              setFlow(flowData);
            }
          } catch (e) {
            console.error('Error loading flow:', e);
          }

          // Load purchases from API using memberId
          if (memberId) {
            try {
              const effectiveSessionId = getSessionId();
              const purchasesUrl = `/api/purchases/${companyId}?memberId=${encodeURIComponent(memberId)}${flowId ? `&flowId=${flowId}` : ''}${effectiveSessionId ? `&sessionId=${encodeURIComponent(effectiveSessionId)}` : ''}`;
              console.log('Confirmation page - Loading purchases:', {
                companyId,
                memberId,
                flowId,
                sessionIdFromUrl,
                sessionIdFromStorage: typeof window !== 'undefined' ? sessionStorage.getItem('flow_session_id') : null,
                effectiveSessionId,
                url: purchasesUrl
              });
              const purchasesResponse = await fetch(purchasesUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'omit',
              });
              
              if (purchasesResponse.ok) {
                const purchasesData = await purchasesResponse.json();
                console.log('Confirmation page - Purchases received:', {
                  count: purchasesData.purchases?.length || 0,
                  purchases: purchasesData.purchases,
                  total: purchasesData.total
                });
                if (purchasesData.purchases && purchasesData.purchases.length > 0) {
                  setPurchasedProducts(purchasesData.purchases);
                  setLoading(false);
                  return;
                }
              } else {
                console.error('Confirmation page - Failed to load purchases:', purchasesResponse.status, await purchasesResponse.text());
              }
            } catch (e) {
              console.error('Error loading purchases:', e);
            }
          }
        }

        // Fallback: Try to get from localStorage
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
          // localStorage may be blocked in cross-origin iframes
        }
      } catch (err) {
        console.error('Error loading data:', err);
        if (!companyId && !memberId) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
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

  // Send height updates to parent iframe (for embed responsiveness)
  useEffect(() => {
    const sendHeight = () => {
      if (typeof window !== 'undefined' && window.parent !== window) {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*');
      }
    };

    // Send height on mount and when content changes
    sendHeight();
    const interval = setInterval(sendHeight, 500);
    
    // Also send on resize and content changes
    window.addEventListener('resize', sendHeight);
    
    // Use MutationObserver to detect content changes
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', sendHeight);
      observer.disconnect();
    };
  }, [flow, loading, purchasedProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
        <div className="text-white text-sm md:text-base">Loading...</div>
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


  return (
    <div 
      className="min-h-screen flex items-center justify-center p-3 md:p-4"
      style={{ backgroundColor: custom.backgroundColor || '#1a1a1a' }}
    >
      <div 
        className="w-full max-w-2xl border rounded-xl md:rounded-2xl shadow-xl overflow-hidden"
        style={{ 
          backgroundColor: custom.cardBackgroundColor || '#2a2a2a',
          borderColor: custom.cardBackgroundColor ? 'rgba(255,255,255,0.1)' : '#3a3a3a'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 md:p-6 text-center"
          style={{
            background: `linear-gradient(to right, ${custom.headerGradientStart || custom.primaryColor || '#0D6B4D'}, ${custom.headerGradientEnd || '#0b5940'})`
          }}
        >
          <h1 
            className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2"
            style={{ color: custom.headerTextColor || '#ffffff' }}
          >
            {getHeaderTitle()}
          </h1>
          <p 
            className="text-xs md:text-sm"
            style={{ color: custom.headerTextColor ? `${custom.headerTextColor}CC` : 'rgba(255, 255, 255, 0.9)' }}
          >
            {getHeaderSubtitle()}
          </p>
        </div>

        {/* Confirmation Content */}
        <div className="p-4 md:p-6 lg:p-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: custom.textColor || '#ffffff' }}>Your Purchases:</h2>
          
          {purchasedProducts.length > 0 ? (
            <>
              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                {purchasedProducts.map((product, index) => (
                  <div key={index} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base" style={{ color: custom.textColor || '#ffffff' }}>{product.name}</h3>
                      <p className="text-xs md:text-sm" style={{ color: custom.textColor || '#ffffff', opacity: 0.7 }}>
                        {product.type === 'subscription' ? 'Subscription (Monthly)' : 'One-time Purchase'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="font-bold text-sm md:text-base" style={{ color: custom.textColor || '#ffffff' }}>${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#3a3a3a] pt-3 md:pt-4 mb-4 md:mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-semibold" style={{ color: custom.textColor || '#ffffff' }}>Total:</span>
                  <span className="text-xl md:text-2xl font-bold" style={{ color: custom.primaryColor || '#0D6B4D' }}>${total.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-4 md:mb-6">
              <p className="text-sm md:text-base" style={{ color: custom.textColor || '#ffffff', opacity: 0.7 }}>Your order has been processed successfully.</p>
            </div>
          )}

          <div 
            className="border rounded-lg p-3 md:p-4 mb-4 md:mb-6"
            style={{
              backgroundColor: `${custom.primaryColor || '#0D6B4D'}20`,
              borderColor: `${custom.primaryColor || '#0D6B4D'}40`
            }}
          >
            <p className="text-xs md:text-sm" style={{ color: custom.textColor || '#ffffff' }}>
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
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
        <div className="text-white text-sm md:text-base">Loading...</div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}

