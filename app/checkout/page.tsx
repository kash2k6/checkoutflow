'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import Link from 'next/link';

interface FlowNode {
  id: string;
  node_type: 'upsell' | 'downsell' | 'cross_sell';
  plan_id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  original_price: number | null;
  redirect_url: string;
  order_index: number;
}

interface CompanyFlow {
  id: string;
  company_id: string;
  initial_product_plan_id: string;
  confirmation_page_url: string | null;
  checkout_theme?: 'light' | 'dark' | 'system' | null;
  checkout_customization?: {
    buttonColor?: string;
    buttonTextColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    productImageUrl?: string;
    cardBackgroundColor?: string;
  } | null;
  nodes: FlowNode[];
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = searchParams.get('companyId');
  const flowId = searchParams.get('flowId'); // Get flowId from URL
  const planId = searchParams.get('planId'); // Fallback if companyId not provided
  const [checkoutConfigId, setCheckoutConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<CompanyFlow | null>(null);
  const [productInfo, setProductInfo] = useState<{ name: string; price: string } | null>(null);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID
    if (typeof window !== 'undefined') {
      let sid = sessionStorage.getItem('flow_session_id');
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('flow_session_id', sid);
      }
      return sid;
    }
    return null;
  });

  // Detect system theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Load flow configuration if companyId is provided
  useEffect(() => {
    const loadFlow = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      try {
        // Use flowId if provided, otherwise get first flow
        const url = flowId 
          ? `/api/flows/${companyId}?flowId=${flowId}`
          : `/api/flows/${companyId}`;
        const response = await fetch(url);
        if (response.ok) {
          const flowData = await response.json();
          setFlow(flowData);
          
          // Track visit
          if (flowData.id && companyId && sessionId) {
            fetch('/api/track/visit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                flow_id: flowData.id,
                company_id: companyId,
                session_id: sessionId,
                page_type: 'checkout',
                user_agent: navigator.userAgent,
                referrer: document.referrer,
              }),
            }).catch(err => console.error('Error tracking visit:', err));
          }

          // Initialize Facebook Pixel if available
          const pixelId = flowData.facebook_pixel_id;
          if (pixelId && typeof window !== 'undefined') {
            (window as any).fbq = (window as any).fbq || function() {
              ((window as any).fbq.q = (window as any).fbq.q || []).push(arguments);
            };
            (window as any).fbq.l = +new Date();
            (window as any).fbq('init', pixelId);
            (window as any).fbq('track', 'PageView');
          }
          
          // Fetch product info from Whop API
          if (flowData.initial_product_plan_id) {
            const plansResponse = await fetch(`/api/whop/plans?companyId=${companyId}`);
            if (plansResponse.ok) {
              const plansData = await plansResponse.json();
              const plan = plansData.plans?.find((p: any) => p.id === flowData.initial_product_plan_id);
              if (plan) {
                // Try multiple possible fields for product name
                const productName = plan.title || 
                                  plan.product?.title || 
                                  plan.name || 
                                  plan.product?.name ||
                                  plan.product?.title ||
                                  'Product';
                const productPrice = plan.initial_price || plan.price || 0;
                const productCurrency = (plan.currency || 'usd').toUpperCase();
                
                setProductInfo({
                  name: productName,
                  price: `$${productPrice} ${productCurrency}`,
                });
              }
            }
          }
        } else if (response.status === 404) {
          setError('Flow configuration not found. Please configure your checkout flow in the dashboard.');
        }
      } catch (err) {
        console.error('Error loading flow:', err);
        setError('Failed to load flow configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadFlow();
  }, [companyId, flowId, sessionId]);

  // Create checkout configuration
  useEffect(() => {
    const createCheckoutConfig = async () => {
      const finalPlanId = flow?.initial_product_plan_id || planId;
      
      if (!finalPlanId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user email from localStorage
        const userData = localStorage.getItem('xperience_user_data');
        const userEmail = userData ? JSON.parse(userData).email : null;

        // Create checkout configuration with metadata
        const response = await fetch('/api/whop/checkout-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: finalPlanId,
            userEmail,
            companyId: companyId || undefined,
            flowId: flow?.id || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create checkout configuration');
        }

        const data = await response.json();
        setCheckoutConfigId(data.checkoutConfigId);

        // Track InitiateCheckout event
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'InitiateCheckout', {
            content_ids: [finalPlanId],
            content_type: 'product',
          });
        }
      } catch (err) {
        console.error('Error creating checkout config:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize checkout');
      } finally {
        setIsLoading(false);
      }
    };

    if (flow || planId) {
    createCheckoutConfig();
    }
  }, [flow, planId, companyId]);

  // Send height updates to parent iframe (for embed responsiveness)
  // Must be before any conditional returns to follow Rules of Hooks
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
    
    // Also send on resize
    window.addEventListener('resize', sendHeight);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', sendHeight);
    };
  }, [checkoutConfigId, productInfo, isLoading, error]);

  const handleCheckoutComplete = async () => {
    try {
      // Setup mode checkout completed - payment method is now saved
      // The webhook should have saved the data to Supabase by now
      
      const finalPlanId = flow?.initial_product_plan_id || planId;
      if (!finalPlanId) {
        alert('Product not configured. Please contact support.');
        return;
      }

      // Get member ID and setup intent ID from Supabase/API using checkoutConfigId
                let memberId: string | null = null;
                let setupIntentId: string | null = null;
                let userEmail: string | null = null;
                
                let attempts = 0;
      const maxAttempts = 10;

                while (!memberId && attempts < maxAttempts) {
                  attempts++;
                  const waitTime = attempts === 1 ? 2000 : 1000; // Wait 2s first, then 1s
                  await new Promise(resolve => setTimeout(resolve, waitTime));

                  try {
                    // Try to get data by checkoutConfigId first (most reliable)
                    const response = await fetch(
                      `/api/whop/webhook?checkoutConfigId=${checkoutConfigId}`
                    );
                    
                    if (response.ok) {
                      const data = await response.json();
                      memberId = data.memberId || null;
                      setupIntentId = data.setupIntentId || null;
                      userEmail = data.email || null;
                      
                      if (memberId) {
                        localStorage.setItem('whop_member_id', memberId);
                        if (setupIntentId) {
                          localStorage.setItem('whop_setup_intent_id', setupIntentId);
                        }
                        if (userEmail) {
                          localStorage.setItem('xperience_user_data', JSON.stringify({ email: userEmail }));
                        }
                        break;
                      }
                    }
                  } catch (apiError) {
                    console.error(`Error calling API (attempt ${attempts}):`, apiError);
          if (attempts < maxAttempts) continue;
        }
      }

      // If still no memberId, try using email from localStorage as fallback
      if (!memberId) {
        const userData = localStorage.getItem('xperience_user_data');
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            if (parsed.email) {
              const lastAttempt = await fetch(
                `/api/whop/webhook?email=${encodeURIComponent(parsed.email)}&checkoutConfigId=${checkoutConfigId}`
              );
              if (lastAttempt.ok) {
                const lastData = await lastAttempt.json();
                if (lastData.memberId) {
                  memberId = lastData.memberId;
                  setupIntentId = lastData.setupIntentId || null;
                  userEmail = lastData.email || parsed.email;
                  if (memberId) {
                    localStorage.setItem('whop_member_id', memberId);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing localStorage data:', e);
          }
        }
      }

                if (memberId) {
        // Charge the initial product
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  const chargeResponse = await fetch('/api/whop/charge-initial', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      memberId,
            planId: finalPlanId,
            userEmail: userEmail || undefined,
            companyId: companyId || undefined,
            flowId: flow?.id || undefined,
                    }),
                  });
                  
                  const chargeData = await chargeResponse.json();
                  
                  if (chargeResponse.ok) {
          // Redirect to first upsell or confirmation
          const upsellNodes = flow?.nodes.filter(n => n.node_type === 'upsell').sort((a, b) => a.order_index - b.order_index) || [];
          
          if (upsellNodes.length > 0) {
            // Redirect to first upsell
            const firstUpsell = upsellNodes[0];
            
            // Check if redirect_url is our own domain or external
            let redirectUrl: URL;
            try {
              redirectUrl = new URL(firstUpsell.redirect_url);
              // If it's an external URL, redirect there with params
              if (redirectUrl.origin !== window.location.origin) {
                redirectUrl.searchParams.set('companyId', companyId || '');
                redirectUrl.searchParams.set('flowId', flow?.id || '');
                redirectUrl.searchParams.set('nodeId', firstUpsell.id);
                redirectUrl.searchParams.set('memberId', memberId);
                if (setupIntentId) {
                  redirectUrl.searchParams.set('setupIntentId', setupIntentId);
                }
                window.location.href = redirectUrl.toString();
                return;
              }
            } catch (e) {
              // If redirect_url is not a valid URL, treat it as a relative path
            }
            
            // If it's our domain or a relative path, redirect to our /upsell page
            const upsellUrl = new URL('/upsell', window.location.origin);
            upsellUrl.searchParams.set('companyId', companyId || '');
            upsellUrl.searchParams.set('flowId', flow?.id || '');
            upsellUrl.searchParams.set('nodeId', firstUpsell.id);
            upsellUrl.searchParams.set('memberId', memberId);
                    if (setupIntentId) {
              upsellUrl.searchParams.set('setupIntentId', setupIntentId);
            }
            window.location.href = upsellUrl.toString();
          } else if (flow?.confirmation_page_url) {
            // Redirect to confirmation
            const redirectUrl = new URL(flow.confirmation_page_url);
            redirectUrl.searchParams.set('companyId', companyId || '');
            redirectUrl.searchParams.set('memberId', memberId);
            window.location.href = redirectUrl.toString();
                    } else {
            // Default: show success message
            alert('Payment successful! Thank you for your purchase.');
                    }
                  } else {
                    console.error('Error charging initial product:', chargeData);
          alert(`Payment setup completed, but there was an issue processing your order: ${chargeData.error || 'Unknown error'}. Please contact support.`);
                  }
                } else {
                  alert('Payment method saved successfully! However, we encountered an issue processing your order. Please contact support with your email address.');
                }
              } catch (error) {
                console.error('Error processing checkout completion:', error);
                alert('Payment method saved! However, we encountered an issue. Please contact support or try again in a moment.');
    }
  };

  // Determine effective theme (calculate after flow is loaded)
  const effectiveTheme = flow?.checkout_theme === 'system' 
    ? systemTheme 
    : (flow?.checkout_theme || 'system') === 'system' 
      ? systemTheme 
      : (flow?.checkout_theme as 'light' | 'dark') || 'dark';
  
  // Theme-based styles (use customization if available, otherwise use theme defaults)
  const custom = flow?.checkout_customization || {};
  const bgColorClass = custom.backgroundColor 
    ? '' // Will use inline style
    : (effectiveTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white');
  const bgColorStyle = custom.backgroundColor ? { backgroundColor: custom.backgroundColor } : {};
  const textColorStyle = custom.textColor || (effectiveTheme === 'dark' ? '#ffffff' : '#000000');
  const borderColorClass = custom.borderColor 
    ? '' // Will use inline style
    : (effectiveTheme === 'dark' ? 'border-[#3a3a3a]' : 'border-gray-a4');
  const borderColorStyle = custom.borderColor ? { borderColor: custom.borderColor } : {};
  const secondaryTextColor = effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-10';
  
  // Card background color (for product card)
  const cardBgColor = custom.cardBackgroundColor || (effectiveTheme === 'dark' ? '#2a2a2a' : '#ffffff');

  if (isLoading) {
    // Use system theme for loading state
    const loadingBg = systemTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white';
    const loadingText = systemTheme === 'dark' ? 'text-white' : 'text-gray-12';
    return (
      <div className={`min-h-screen ${loadingBg} flex items-center justify-center`}>
        <div className={loadingText}>Loading checkout...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${bgColorClass} flex items-center justify-center px-4`} style={bgColorStyle}>
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4" style={{ color: textColorStyle }}>Error</h1>
          <p className={`${secondaryTextColor} mb-6`}>{error}</p>
        </div>
      </div>
    );
  }

  const finalPlanId = flow?.initial_product_plan_id || planId;
  if (!finalPlanId) {
    return (
      <div className={`min-h-screen ${bgColorClass} flex items-center justify-center px-4`} style={bgColorStyle}>
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4" style={{ color: textColorStyle }}>No Product Selected</h1>
          <p className={`${secondaryTextColor} mb-6`}>Please select a product to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColorClass} flex flex-col`} style={bgColorStyle}>
      {/* Product Info & Checkout Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {/* Product Information Card */}
        {(productInfo || custom.productImageUrl) && (
          <div 
            className="mb-6 rounded-lg border overflow-hidden shadow-md"
            style={{
              backgroundColor: cardBgColor,
              borderColor: borderColorStyle.borderColor || (effectiveTheme === 'dark' ? '#3a3a3a' : '#e5e7eb'),
            }}
          >
            <div className="p-4 flex flex-row items-center gap-4">
              {/* Product Image */}
              {custom.productImageUrl && (
                <div className="flex-shrink-0">
                  <img 
                    src={custom.productImageUrl} 
                    alt={productInfo?.name || 'Product'} 
                    className="w-24 h-24 object-contain rounded"
                    style={{
                      backgroundColor: effectiveTheme === 'dark' ? '#1a1a1a' : '#f9fafb',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Product Details */}
              <div className="flex-1">
                {productInfo?.name && (
                  <h2 
                    className="text-lg font-bold mb-1" 
                    style={{ color: textColorStyle }}
                  >
                    {productInfo.name}
                  </h2>
                )}
                {productInfo?.price && (
                  <p 
                    className="text-base font-semibold" 
                    style={{ color: custom.buttonColor || '#0D6B4D' }}
                  >
                    {productInfo.price}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Checkout Embed */}
        <div className="w-full">
          {checkoutConfigId ? (
            <WhopCheckoutEmbed
              sessionId={checkoutConfigId}
              theme={(flow?.checkout_theme as 'light' | 'dark' | 'system') || "system"}
              onComplete={handleCheckoutComplete}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-gray-12 dark:text-white">Loading...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

