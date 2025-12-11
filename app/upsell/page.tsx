'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  customization?: {
    primaryColor?: string;
    headerGradientStart?: string;
    headerGradientEnd?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    secondaryButtonColor?: string;
    headerTitle?: string;
    headerSubtitle?: string;
    headerTextColor?: string;
    acceptButtonText?: string;
    declineButtonText?: string;
    trustBadgeText?: string;
    priceLabel?: string;
    originalPriceLabel?: string;
    savingsText?: string;
    buttonStyle?: 'rounded' | 'square' | 'pill';
    headerEmoji?: string;
    productImageUrl?: string;
  } | null;
}

interface CompanyFlow {
  id: string;
  company_id: string;
  initial_product_plan_id: string;
  confirmation_page_url: string | null;
  nodes: FlowNode[];
}

  function UpsellContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
  const companyId = searchParams.get('companyId');
  const flowId = searchParams.get('flowId');
  const nodeId = searchParams.get('nodeId');
    const memberIdFromUrl = searchParams.get('memberId');
    const setupIntentIdFromUrl = searchParams.get('setupIntentId');
  
    // Get sessionId from URL or sessionStorage
    const sessionIdFromUrl = searchParams.get('sessionId');
    const getSessionId = (): string | null => {
      if (sessionIdFromUrl) return sessionIdFromUrl;
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('flow_session_id');
        if (stored) return stored;
      }
      return null;
    };
  
  const [flow, setFlow] = useState<CompanyFlow | null>(null);
  const [currentNode, setCurrentNode] = useState<FlowNode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<Array<{
    name: string;
    price: number;
    type: 'one_time' | 'subscription';
  }>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset confirmation state ONLY when URL parameters change (not on every render)
  // This prevents confirmation from showing on initial page load
  useEffect(() => {
    setShowConfirmation(false);
  }, [companyId, flowId, nodeId]);

  // Load flow and node configuration
  useEffect(() => {
    const loadFlow = async () => {
      console.log('Upsell page - Parameters:', { companyId, flowId, nodeId, memberIdFromUrl, setupIntentIdFromUrl });
      
      if (!companyId) {
        setError('Missing required parameter: companyId');
        setLoading(false);
        return;
      }
      
      if (!flowId) {
        setError('Missing required parameter: flowId');
        setLoading(false);
        return;
      }
      
      if (!nodeId) {
        setError('Missing required parameter: nodeId');
        setLoading(false);
        return;
      }

      try {
        // Use flowId if provided, otherwise get first flow for company
        // Add cache-busting timestamp to ensure fresh data (especially for confirmation_page_url)
        const timestamp = Date.now();
        const apiUrl = flowId 
          ? `/api/flows/${companyId}?flowId=${flowId}&_t=${timestamp}`
          : `/api/flows/${companyId}?_t=${timestamp}`;
        const response = await fetch(apiUrl, {
          cache: 'no-store', // Prevent browser caching
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        // Check if response indicates subscription is required
        if (response.status === 403) {
          const errorData = await response.json();
          setError(errorData.error || 'Funnel access requires an active subscription. Please contact the company owner to subscribe.');
          setLoading(false);
          return;
        }
        
        if (response.ok) {
          const flowData = await response.json();
          
          // Check if funnel is disabled due to missing subscription
          if (flowData.enabled === false || !flowData.enabled) {
            setError('This funnel is currently disabled. The company owner needs an active subscription to enable funnels. Please contact support.');
            setLoading(false);
            return;
          }
          
          setFlow(flowData);
          
          // Find the current node
          const node = flowData.nodes.find((n: FlowNode) => n.id === nodeId);
          if (node) {
            setCurrentNode(node);
          } else {
            setError('Node not found in flow configuration');
          }
        } else if (response.status === 404) {
          setError('Flow configuration not found');
        } else if (response.status === 403) {
          // Already handled above, but keep for safety
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Funnel access requires an active subscription.');
        } else {
          setError('Flow configuration not found');
        }
      } catch (err) {
        console.error('Error loading flow:', err);
        setError('Failed to load flow configuration');
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [companyId, flowId, nodeId]);

  useEffect(() => {
    // Store member ID and setup intent ID
    if (memberIdFromUrl) {
      localStorage.setItem('whop_member_id', memberIdFromUrl);
    }
    if (setupIntentIdFromUrl) {
      localStorage.setItem('whop_setup_intent_id', setupIntentIdFromUrl);
    }
    // Store session ID if provided in URL (for passing through to confirmation)
    if (sessionIdFromUrl && typeof window !== 'undefined') {
      sessionStorage.setItem('flow_session_id', sessionIdFromUrl);
    }

    // Track page view
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView', {
        content_name: `${currentNode?.node_type || 'Upsell'} Page`,
      });
    }

    // Initialize Facebook Pixel if available (node-level or flow-level)
    const pixelId = (currentNode as any)?.facebook_pixel_id || (flow as any)?.facebook_pixel_id;
    if (pixelId && typeof window !== 'undefined') {
      (window as any).fbq = (window as any).fbq || function() {
        ((window as any).fbq.q = (window as any).fbq.q || []).push(arguments);
      };
      (window as any).fbq.l = +new Date();
      (window as any).fbq('init', pixelId);
      (window as any).fbq('track', 'PageView');
    }
  }, [memberIdFromUrl, setupIntentIdFromUrl, currentNode, flow]);

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
  }, [currentNode, flow, loading, error, showConfirmation, purchasedProducts]);

  const getMemberId = async (): Promise<string | null> => {
    // Try URL param first
    if (memberIdFromUrl) return memberIdFromUrl;
    
    // Try localStorage
    const stored = localStorage.getItem('whop_member_id');
    if (stored) return stored;
    
    // Try to fetch by setup intent ID
        const setupIntentId = setupIntentIdFromUrl || localStorage.getItem('whop_setup_intent_id');
        if (setupIntentId) {
          try {
        const response = await fetch(`/api/whop/webhook?setupIntentId=${setupIntentId}`);
            if (response.ok) {
          const data = await response.json();
          if (data.memberId) {
            localStorage.setItem('whop_member_id', data.memberId);
            return data.memberId;
                }
              }
            } catch (error) {
              console.error('Error fetching member ID:', error);
            }
          }
      
    // Try to fetch by email
      const userData = localStorage.getItem('xperience_user_data');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.email) {
          const response = await fetch(`/api/whop/webhook?email=${encodeURIComponent(parsed.email)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.memberId) {
              localStorage.setItem('whop_member_id', data.memberId);
              return data.memberId;
      }
          }
        }
      } catch (error) {
        console.error('Error fetching member ID by email:', error);
    }
    }
    
    return null;
  };

  // Helper function to handle redirect (works for both iframe and standalone)
  const handleRedirect = (url: string, shouldRedirectParent = false) => {
    const isInIframe = typeof window !== 'undefined' && window.parent !== window;
    
    if (isInIframe) {
      if (shouldRedirectParent) {
        // For external URLs, try to redirect parent page via postMessage
        // This is for custom embed scripts that listen for this message
        window.parent.postMessage({
          type: 'xperience-redirect',
          url: url,
          action: 'redirect-parent'
        }, '*');
        // Also try direct redirect (may not work due to same-origin policy, but worth trying)
        try {
          window.top!.location.href = url;
        } catch (e) {
          // Cross-origin, can't redirect parent - postMessage is the only option
          console.log('Cannot redirect parent due to cross-origin restrictions. Using postMessage.');
        }
      } else {
        // For internal URLs, update iframe content directly
        // This works in both Whop's iframe and custom embeds
        window.location.href = url;
        // Also send postMessage for custom embed scripts that might want to listen
        window.parent.postMessage({
          type: 'xperience-redirect',
          url: url,
          action: 'update-iframe'
        }, '*');
      }
    } else {
      // Not in iframe, normal redirect
      window.location.href = url;
    }
  };

  const handleAccept = async () => {
    if (!currentNode) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const memberId = await getMemberId();
      
      if (!memberId) {
        setError('Member ID not found. Please contact support or try the checkout again.');
        setIsProcessing(false);
        return;
      }

      // Get payment method ID from Supabase
      let paymentMethodId: string | null = null;
      const userData = localStorage.getItem('xperience_user_data');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.email) {
            const paymentMethodResponse = await fetch(
              `/api/whop/webhook?email=${encodeURIComponent(parsed.email)}`
            );
            if (paymentMethodResponse.ok) {
              const paymentData = await paymentMethodResponse.json();
              paymentMethodId = paymentData.paymentMethodId || null;
            }
          }
        } catch (error) {
          console.error('Error fetching payment method:', error);
        }
      }

      // Charge the product
      const response = await fetch('/api/whop/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          paymentMethodId,
          planId: currentNode.plan_id,
          amount: currentNode.price || 0,
          currency: 'usd',
          isSubscription: false, // Can be determined from plan if needed
          companyId: companyId, // Pass companyId from URL params
          flowId: flowId, // Pass flowId to track purchase
          nodeId: currentNode.id, // Pass nodeId to track which upsell was purchased
          purchaseType: currentNode.node_type === 'upsell' ? 'upsell' : 
                       currentNode.node_type === 'downsell' ? 'downsell' : 
                       currentNode.node_type === 'cross_sell' ? 'cross_sell' : 'upsell',
          sessionId: sessionStorage.getItem('flow_session_id') || null, // Pass session ID for tracking
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      // Track purchase
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          content_name: currentNode.title || 'Product',
          value: currentNode.price || 0,
          currency: 'USD',
        });
      }

      // Add to purchased products
      setPurchasedProducts(prev => [...prev, {
        name: currentNode.title || 'Product',
        price: currentNode.price || 0,
        type: 'one_time',
      }]);

      // Find next action based on configured logic
      const nextAction = findNextAction('accept');
      
      if (nextAction.type === 'node' && nextAction.target) {
        // Redirect to next node
        let redirectUrl: URL;
        const sessionId = getSessionId();
        try {
          redirectUrl = new URL(nextAction.target.redirect_url);
          // If it's an external URL, redirect parent page
          if (redirectUrl.origin !== window.location.origin) {
            redirectUrl.searchParams.set('companyId', companyId || '');
            redirectUrl.searchParams.set('flowId', flowId || '');
            redirectUrl.searchParams.set('nodeId', nextAction.target.id);
            redirectUrl.searchParams.set('memberId', memberId);
            if (sessionId) {
              redirectUrl.searchParams.set('sessionId', sessionId);
            }
            if (setupIntentIdFromUrl) {
              redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
            }
            handleRedirect(redirectUrl.toString(), true); // Redirect parent for external URLs
            return;
          }
        } catch (e) {
          // If redirect_url is not a valid URL, treat it as a relative path
        }
        
        // If it's our domain or a relative path, redirect to our /upsell page
        redirectUrl = new URL('/upsell', window.location.origin);
        redirectUrl.searchParams.set('companyId', companyId || '');
        redirectUrl.searchParams.set('flowId', flowId || '');
        redirectUrl.searchParams.set('nodeId', nextAction.target.id);
        redirectUrl.searchParams.set('memberId', memberId);
        if (sessionId) {
          redirectUrl.searchParams.set('sessionId', sessionId);
        }
        if (setupIntentIdFromUrl) {
          redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
        }
        handleRedirect(redirectUrl.toString()); // Update iframe for internal URLs
      } else if (nextAction.type === 'node' && !nextAction.target) {
        // Edge case: edge points to a node but target node not found in flow
        console.warn('Edge configured to go to node, but target node not found in flow. Using fallback logic.');
        const sessionId = getSessionId();
        const fallbackNode = findNextNodeFallback(currentNode, 'accept');
        if (fallbackNode) {
          const redirectUrl = new URL('/upsell', window.location.origin);
          redirectUrl.searchParams.set('companyId', companyId || '');
          redirectUrl.searchParams.set('flowId', flowId || '');
          redirectUrl.searchParams.set('nodeId', fallbackNode.id);
          redirectUrl.searchParams.set('memberId', memberId);
          if (sessionId) {
            redirectUrl.searchParams.set('sessionId', sessionId);
          }
          if (setupIntentIdFromUrl) {
            redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
          }
          handleRedirect(redirectUrl.toString());
        } else {
          // No fallback node, go to confirmation
          if (flow?.confirmation_page_url) {
            const redirectUrl = new URL(flow.confirmation_page_url);
            redirectUrl.searchParams.set('companyId', companyId || '');
            redirectUrl.searchParams.set('memberId', memberId);
            // Pass sessionId to filter purchases by current transaction
            const sessionId = getSessionId();
            if (sessionId) {
              redirectUrl.searchParams.set('sessionId', sessionId);
            }
            // For external confirmation pages, don't pass flowId (prevents embed.js from thinking it's an upsell)
            // Only pass flowId for internal confirmation pages
            const isExternal = redirectUrl.origin !== window.location.origin;
            if (!isExternal) {
              redirectUrl.searchParams.set('flowId', flowId || '');
            }
            // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
            redirectUrl.searchParams.delete('nodeId');
            // Add confirmation=true parameter for external pages to help embed.js detect it's a confirmation page
            if (isExternal) {
              redirectUrl.searchParams.set('confirmation', 'true');
            }
            handleRedirect(redirectUrl.toString(), isExternal);
          } else if (purchasedProducts.length > 0) {
            setShowConfirmation(true);
          }
        }
      } else if (nextAction.type === 'confirmation' && nextAction.url) {
        // Redirect to confirmation page
        const redirectUrl = new URL(nextAction.url);
        redirectUrl.searchParams.set('companyId', companyId || '');
        redirectUrl.searchParams.set('memberId', memberId);
        // Pass sessionId to filter purchases by current transaction
        const sessionId = getSessionId();
        if (sessionId) {
          redirectUrl.searchParams.set('sessionId', sessionId);
        }
        // For external confirmation pages, don't pass flowId (prevents embed.js from thinking it's an upsell)
        // Only pass flowId for internal confirmation pages
        const isExternal = redirectUrl.origin !== window.location.origin;
        if (!isExternal) {
          redirectUrl.searchParams.set('flowId', flowId || '');
        }
        // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
        redirectUrl.searchParams.delete('nodeId');
        // Add confirmation=true parameter for external pages to help embed.js detect it's a confirmation page
        if (isExternal) {
          redirectUrl.searchParams.set('confirmation', 'true');
        }
        handleRedirect(redirectUrl.toString(), isExternal);
      } else if (nextAction.type === 'external_url' && nextAction.url) {
        // Redirect to external URL
        const redirectUrl = new URL(nextAction.url);
        redirectUrl.searchParams.set('companyId', companyId || '');
        redirectUrl.searchParams.set('flowId', flowId || '');
        redirectUrl.searchParams.set('memberId', memberId);
        handleRedirect(redirectUrl.toString(), true); // Always redirect parent for external URLs
      } else {
        // Fallback: show confirmation or redirect to confirmation page
        if (flow?.confirmation_page_url) {
          const redirectUrl = new URL(flow.confirmation_page_url);
          redirectUrl.searchParams.set('companyId', companyId || '');
          redirectUrl.searchParams.set('memberId', memberId);
          // Pass sessionId to filter purchases by current transaction
          const sessionId = getSessionId();
          if (sessionId) {
            redirectUrl.searchParams.set('sessionId', sessionId);
          }
          // For external confirmation pages, don't pass flowId (prevents embed.js from thinking it's an upsell)
          // Only pass flowId for internal confirmation pages
          const isExternal = redirectUrl.origin !== window.location.origin;
          if (!isExternal) {
            redirectUrl.searchParams.set('flowId', flowId || '');
          }
          // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
          redirectUrl.searchParams.delete('nodeId');
          // Add confirmation=true parameter for external pages to help embed.js detect it's a confirmation page
          if (isExternal) {
            redirectUrl.searchParams.set('confirmation', 'true');
          }
          handleRedirect(redirectUrl.toString(), isExternal);
        } else {
          // Only show confirmation if we actually have purchased products
          // Don't show it as a fallback if no purchase was made
          if (purchasedProducts.length > 0) {
            setShowConfirmation(true);
          } else {
            // If no purchase and no confirmation URL, just stay on the upsell page
            console.warn('No next action configured and no confirmation URL. Staying on upsell page.');
          }
        }
      }
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Accept error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      setIsProcessing(false);
    }
  };

  const handleDecline = () => {
    if (!currentNode || isProcessing) return;
    
    // Wait for edges to load before processing
    if (edgesLoading) {
      console.log('Edges still loading, please wait...');
      return;
    }
    
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: `${currentNode.node_type} Declined`,
      });
    }

    // Find next action based on configured logic
    const nextAction = findNextAction('decline');
    
    console.log('Decline clicked - Next action:', nextAction);
    console.log('Current node:', currentNode.id, currentNode.node_type);
    console.log('Available edges:', edges);
    console.log('Edges loading:', edgesLoading);
    console.log('Flow nodes:', flow?.nodes.map(n => ({ id: n.id, type: n.node_type, order: n.order_index })));
    
    if (nextAction.type === 'node' && nextAction.target) {
      // Redirect to next node
      console.log('Redirecting to next node:', nextAction.target.id, nextAction.target.node_type);
      let redirectUrl: URL;
      try {
        redirectUrl = new URL(nextAction.target.redirect_url);
        // If it's an external URL, redirect parent page
        if (redirectUrl.origin !== window.location.origin) {
          redirectUrl.searchParams.set('companyId', companyId || '');
          redirectUrl.searchParams.set('flowId', flowId || '');
          redirectUrl.searchParams.set('nodeId', nextAction.target.id);
          if (memberIdFromUrl) {
            redirectUrl.searchParams.set('memberId', memberIdFromUrl);
          }
          if (setupIntentIdFromUrl) {
            redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
          }
          handleRedirect(redirectUrl.toString(), true); // Redirect parent for external URLs
          return;
        }
      } catch (e) {
        // If redirect_url is not a valid URL, treat it as a relative path
        console.log('redirect_url is not a valid URL, treating as relative path');
      }
      
      // If it's our domain or a relative path, redirect to our /upsell page
      redirectUrl = new URL('/upsell', window.location.origin);
      redirectUrl.searchParams.set('companyId', companyId || '');
      redirectUrl.searchParams.set('flowId', flowId || '');
      redirectUrl.searchParams.set('nodeId', nextAction.target.id);
      if (memberIdFromUrl) {
        redirectUrl.searchParams.set('memberId', memberIdFromUrl);
      }
      if (setupIntentIdFromUrl) {
        redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
      }
      console.log('Redirecting to:', redirectUrl.toString());
      handleRedirect(redirectUrl.toString()); // Update iframe for internal URLs
    } else if (nextAction.type === 'node' && !nextAction.target) {
      // Edge case: edge points to a node but target node not found in flow
      console.warn('Edge configured to go to node, but target node not found in flow. Using fallback logic.');
      const fallbackNode = findNextNodeFallback(currentNode, 'decline');
      if (fallbackNode) {
        const sessionId = getSessionId();
        const redirectUrl = new URL('/upsell', window.location.origin);
        redirectUrl.searchParams.set('companyId', companyId || '');
        redirectUrl.searchParams.set('flowId', flowId || '');
        redirectUrl.searchParams.set('nodeId', fallbackNode.id);
        if (memberIdFromUrl) {
          redirectUrl.searchParams.set('memberId', memberIdFromUrl);
        }
        if (sessionId) {
          redirectUrl.searchParams.set('sessionId', sessionId);
        }
        if (setupIntentIdFromUrl) {
          redirectUrl.searchParams.set('setupIntentId', setupIntentIdFromUrl);
        }
        console.log('Using fallback node, redirecting to:', redirectUrl.toString());
        handleRedirect(redirectUrl.toString());
      } else {
        // No fallback node, go to confirmation
        console.log('No fallback node found, going to confirmation');
        if (flow?.confirmation_page_url) {
          const redirectUrl = new URL(flow.confirmation_page_url);
          redirectUrl.searchParams.set('companyId', companyId || '');
          if (memberIdFromUrl) {
            redirectUrl.searchParams.set('memberId', memberIdFromUrl);
          }
          // Pass sessionId to filter purchases by current transaction
          const sessionId = getSessionId();
          if (sessionId) {
            redirectUrl.searchParams.set('sessionId', sessionId);
          }
          // For external confirmation pages, don't pass flowId (prevents embed.js from thinking it's an upsell)
          // Only pass flowId for internal confirmation pages
          const isExternal = redirectUrl.origin !== window.location.origin;
          if (!isExternal) {
            redirectUrl.searchParams.set('flowId', flowId || '');
          }
          // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
          redirectUrl.searchParams.delete('nodeId');
          // Add confirmation=true parameter for external pages to help embed.js detect it's a confirmation page
          if (isExternal) {
            redirectUrl.searchParams.set('confirmation', 'true');
          }
          handleRedirect(redirectUrl.toString(), isExternal);
        } else if (purchasedProducts.length > 0) {
          setShowConfirmation(true);
        }
      }
    } else if (nextAction.type === 'confirmation' && nextAction.url) {
      // Redirect to confirmation page
        console.log('Redirecting to confirmation page:', nextAction.url);
      const redirectUrl = new URL(nextAction.url);
      redirectUrl.searchParams.set('companyId', companyId || '');
      if (memberIdFromUrl) {
        redirectUrl.searchParams.set('memberId', memberIdFromUrl);
      }
      // Pass sessionId to filter purchases by current transaction
      const sessionId = getSessionId();
      if (sessionId) {
        redirectUrl.searchParams.set('sessionId', sessionId);
      }
        // For external confirmation pages, don't pass flowId (prevents embed.js from thinking it's an upsell)
        // Only pass flowId for internal confirmation pages
      const isExternal = redirectUrl.origin !== window.location.origin;
        if (!isExternal) {
          redirectUrl.searchParams.set('flowId', flowId || '');
        }
        // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
        redirectUrl.searchParams.delete('nodeId');
        // Add confirmation=true parameter for external pages to help embed.js detect it's a confirmation page
        if (isExternal) {
          redirectUrl.searchParams.set('confirmation', 'true');
        }
      handleRedirect(redirectUrl.toString(), isExternal);
    } else if (nextAction.type === 'external_url' && nextAction.url) {
      // Redirect to external URL
      console.log('Redirecting to external URL:', nextAction.url);
      const redirectUrl = new URL(nextAction.url);
      redirectUrl.searchParams.set('companyId', companyId || '');
      redirectUrl.searchParams.set('flowId', flowId || '');
      if (memberIdFromUrl) {
        redirectUrl.searchParams.set('memberId', memberIdFromUrl);
      }
      handleRedirect(redirectUrl.toString(), true); // Always redirect parent for external URLs
    } else {
      // Fallback: show confirmation or redirect to confirmation page
      console.log('No configured action found, using fallback');
      if (flow?.confirmation_page_url) {
        const redirectUrl = new URL(flow.confirmation_page_url);
        redirectUrl.searchParams.set('companyId', companyId || '');
        redirectUrl.searchParams.set('flowId', flowId || '');
        if (memberIdFromUrl) {
          redirectUrl.searchParams.set('memberId', memberIdFromUrl);
        }
        // Ensure nodeId is NOT included in confirmation URLs (confirmation pages should never have nodeId)
        redirectUrl.searchParams.delete('nodeId');
        const isExternal = redirectUrl.origin !== window.location.origin;
        handleRedirect(redirectUrl.toString(), isExternal);
      } else {
        // Only show confirmation if we have purchased products, don't show as fallback
        if (purchasedProducts.length > 0) {
          setShowConfirmation(true);
        } else {
          console.warn('No next action configured and no confirmation URL. User may be stuck on page.');
        }
      }
    }
  };

  const [edges, setEdges] = useState<Array<{
    from_node_id: string;
    to_node_id: string | null;
    action: 'accept' | 'decline';
    target_type: 'node' | 'confirmation' | 'external_url';
    target_url: string | null;
  }>>([]);
  const [edgesLoading, setEdgesLoading] = useState(true);

  useEffect(() => {
    const loadEdges = async () => {
      if (!flowId || !currentNode) {
        setEdgesLoading(false);
        return;
      }
      setEdgesLoading(true);
      try {
        const response = await fetch(`/api/flows/${companyId}/edges?flowId=${flowId}&nodeId=${currentNode.id}`);
        if (response.ok) {
          const edgesData = await response.json();
          setEdges(edgesData || []);
          console.log('Edges loaded for node:', currentNode.id, edgesData);
        }
      } catch (error) {
        console.error('Error loading edges:', error);
      } finally {
        setEdgesLoading(false);
      }
    };
    loadEdges();
  }, [flowId, currentNode, companyId]);

  const findNextAction = (action: 'accept' | 'decline'): { type: 'node' | 'confirmation' | 'external_url', target: FlowNode | null, url: string | null } => {
    // CRITICAL: Filter edges by current node ID - otherwise it finds edges from other nodes!
    const edge = edges.find(e => e.action === action && e.from_node_id === currentNode?.id);
    
    console.log(`findNextAction('${action}') - Current node:`, currentNode?.id, currentNode?.node_type);
    console.log(`findNextAction('${action}') - Found edge:`, edge);
    console.log(`findNextAction('${action}') - Total edges:`, edges.length);
    console.log(`findNextAction('${action}') - Edges for current node:`, edges.filter(e => e.from_node_id === currentNode?.id));
    
    if (!edge) {
      // Fallback to old logic if no edge configured
      console.log(`No edge found for action '${action}', using fallback logic`);
      const fallbackNode = findNextNodeFallback(currentNode!, action);
      return { type: 'node', target: fallbackNode, url: null };
    }

    if (edge.target_type === 'node' && edge.to_node_id) {
      const targetNode = flow?.nodes.find(n => n.id === edge.to_node_id);
      console.log(`Edge points to node ${edge.to_node_id}, found:`, targetNode ? targetNode.id : 'NOT FOUND');
      if (!targetNode) {
        console.warn(`Target node ${edge.to_node_id} not found in flow nodes. Available nodes:`, flow?.nodes.map(n => n.id));
      }
      return { type: 'node', target: targetNode || null, url: null };
    } else if (edge.target_type === 'confirmation') {
      // Always use the flow's current confirmation_page_url (in case it was updated)
      // Fallback to edge.target_url if flow doesn't have one
      const confirmationUrl = flow?.confirmation_page_url || edge.target_url || null;
      console.log(`Edge points to confirmation page:`, confirmationUrl);
      return { type: 'confirmation', target: null, url: confirmationUrl };
    } else if (edge.target_type === 'external_url' && edge.target_url) {
      console.log(`Edge points to external URL:`, edge.target_url);
      return { type: 'external_url', target: null, url: edge.target_url };
      }

    console.warn(`Edge found but target_type '${edge.target_type}' not handled properly`);
    return { type: 'node', target: null, url: null };
  };

  const findNextNodeFallback = (current: FlowNode, action: 'accept' | 'decline'): FlowNode | null => {
    if (!flow) return null;

    // Get all nodes sorted by type and order_index
    const upsellNodes = flow.nodes
      .filter(n => n.node_type === 'upsell')
      .sort((a, b) => a.order_index - b.order_index);
    
    const downsellNodes = flow.nodes
      .filter(n => n.node_type === 'downsell')
      .sort((a, b) => a.order_index - b.order_index);
    
    const crossSellNodes = flow.nodes
      .filter(n => n.node_type === 'cross_sell')
      .sort((a, b) => a.order_index - b.order_index);

    // Handle decline actions with proper flow logic
    if (action === 'decline') {
      if (current.node_type === 'upsell') {
        // When declining an upsell: try next upsell, then first downsell, then first cross-sell
        const currentIndex = upsellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < upsellNodes.length - 1) {
          // There's another upsell, go to it
          console.log('Fallback (decline upsell): Found next upsell at index', currentIndex + 1);
          return upsellNodes[currentIndex + 1];
        } else if (downsellNodes.length > 0) {
          // No more upsells, go to first downsell
          console.log('Fallback (decline upsell): No more upsells, going to first downsell');
          return downsellNodes[0];
        } else if (crossSellNodes.length > 0) {
          // No downsells either, go to first cross-sell
          console.log('Fallback (decline upsell): No downsells, going to first cross-sell');
          return crossSellNodes[0];
        }
        // No more nodes, will go to confirmation
        console.log('Fallback (decline upsell): No more nodes, going to confirmation');
        return null;
      } else if (current.node_type === 'downsell') {
        // When declining a downsell: try next downsell, then first cross-sell
        const currentIndex = downsellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < downsellNodes.length - 1) {
          // There's another downsell, go to it
          console.log('Fallback (decline downsell): Found next downsell at index', currentIndex + 1);
          return downsellNodes[currentIndex + 1];
        } else if (crossSellNodes.length > 0) {
          // No more downsells, go to first cross-sell
          console.log('Fallback (decline downsell): No more downsells, going to first cross-sell');
          return crossSellNodes[0];
        }
        // No more nodes, will go to confirmation
        console.log('Fallback (decline downsell): No more nodes, going to confirmation');
        return null;
      } else if (current.node_type === 'cross_sell') {
        // When declining a cross-sell: try next cross-sell, then confirmation
        const currentIndex = crossSellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < crossSellNodes.length - 1) {
          // There's another cross-sell, go to it
          console.log('Fallback (decline cross-sell): Found next cross-sell at index', currentIndex + 1);
          return crossSellNodes[currentIndex + 1];
        }
        // No more cross-sells, will go to confirmation
        console.log('Fallback (decline cross-sell): No more cross-sells, going to confirmation');
        return null;
      }
    } else {
      // Handle accept actions - after accepting, typically continue to next in same type, then next type
      if (current.node_type === 'upsell') {
        // After accepting upsell: try next upsell, then first downsell
        const currentIndex = upsellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < upsellNodes.length - 1) {
          console.log('Fallback (accept upsell): Found next upsell at index', currentIndex + 1);
          return upsellNodes[currentIndex + 1];
        } else if (downsellNodes.length > 0) {
          console.log('Fallback (accept upsell): No more upsells, going to first downsell');
          return downsellNodes[0];
        } else if (crossSellNodes.length > 0) {
          console.log('Fallback (accept upsell): No downsells, going to first cross-sell');
          return crossSellNodes[0];
        }
        console.log('Fallback (accept upsell): No more nodes, going to confirmation');
        return null;
      } else if (current.node_type === 'downsell') {
        // After accepting downsell: try next downsell, then first cross-sell
        const currentIndex = downsellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < downsellNodes.length - 1) {
          console.log('Fallback (accept downsell): Found next downsell at index', currentIndex + 1);
          return downsellNodes[currentIndex + 1];
        } else if (crossSellNodes.length > 0) {
          console.log('Fallback (accept downsell): No more downsells, going to first cross-sell');
          return crossSellNodes[0];
        }
        console.log('Fallback (accept downsell): No more nodes, going to confirmation');
        return null;
      } else if (current.node_type === 'cross_sell') {
        // After accepting cross-sell: try next cross-sell, then confirmation
        const currentIndex = crossSellNodes.findIndex(n => n.id === current.id);
        if (currentIndex >= 0 && currentIndex < crossSellNodes.length - 1) {
          console.log('Fallback (accept cross-sell): Found next cross-sell at index', currentIndex + 1);
          return crossSellNodes[currentIndex + 1];
        }
        console.log('Fallback (accept cross-sell): No more cross-sells, going to confirmation');
        return null;
      }
    }
    
    console.log('Fallback: No matching logic, returning null');
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
        <div className="text-white text-sm md:text-base">Loading...</div>
      </div>
    );
  }

  if (error) {
          return (
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-md w-full">
          <h1 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">Error</h1>
          <p className="text-gray-400 mb-4 text-sm md:text-base">{error}</p>
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-3 md:p-4 mb-4 text-left">
            <p className="text-gray-300 text-xs md:text-sm mb-2">URL Parameters:</p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>companyId: {companyId || '❌ Missing'}</li>
              <li>flowId: {flowId || '❌ Missing'}</li>
              <li>nodeId: {nodeId || '❌ Missing'}</li>
              <li>memberId: {memberIdFromUrl || 'Not provided'}</li>
              <li>setupIntentId: {setupIntentIdFromUrl || 'Not provided'}</li>
            </ul>
            <p className="text-gray-300 text-xs md:text-sm mt-4 mb-2">Current URL:</p>
            <p className="text-gray-400 text-xs break-all">{typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
          </div>
          <Link href="/" className="text-[#0D6B4D] hover:underline text-sm md:text-base">
            Go to Home
                </Link>
              </div>
            </div>
          );
        }

  if (!currentNode) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-md w-full">
          <h1 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">Node Not Found</h1>
          <p className="text-gray-400 mb-4 text-sm md:text-base">The node configuration could not be loaded.</p>
          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-3 md:p-4 mb-4 text-left">
            <p className="text-gray-300 text-xs md:text-sm mb-2">URL Parameters:</p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>companyId: {companyId || '❌ Missing'}</li>
              <li>flowId: {flowId || '❌ Missing'}</li>
              <li>nodeId: {nodeId || '❌ Missing'}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Show confirmation page ONLY if we have purchased products AND showConfirmation is explicitly true
  // Double-check to prevent premature rendering - only show if we actually made a purchase
  // Also check that we're not still loading and that we have a currentNode (means we're on upsell page)
  // Only show confirmation if:
  // 1. showConfirmation is explicitly true
  // 2. We have purchased products with actual prices (> 0)
  // 3. We're not loading
  // 4. We have a currentNode (we're on upsell page)
  const hasPurchasedProducts = purchasedProducts && 
                                purchasedProducts.length > 0 && 
                                purchasedProducts.some(p => p.price > 0); // Must have at least one product with price > 0
  const shouldShowConfirmation = showConfirmation === true && 
                                  hasPurchasedProducts &&
                                  !loading &&
                                  currentNode;
  
  if (shouldShowConfirmation) {
    const total = purchasedProducts.reduce((sum, product) => sum + product.price, 0);
    const oneTimeProducts = purchasedProducts.filter(p => p.type === 'one_time');
    const subscriptionProducts = purchasedProducts.filter(p => p.type === 'subscription');

    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-3 md:p-4">
        <div className="w-full max-w-2xl bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl md:rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#0D6B4D] to-[#0b5940] p-4 md:p-6 text-center">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">✅ Order Complete!</h1>
            <p className="text-green-100 text-xs md:text-sm">Thank you for your purchase</p>
          </div>

          <div className="p-4 md:p-6 lg:p-8">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Your Purchases:</h2>
            
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              {purchasedProducts.map((product, index) => (
                <div key={index} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm md:text-base">{product.name}</h3>
                    <p className="text-gray-400 text-xs md:text-sm">
                      {product.type === 'subscription' ? 'Subscription (Monthly)' : 'One-time Purchase'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-white font-bold text-sm md:text-base">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#3a3a3a] pt-3 md:pt-4 mb-4 md:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-semibold text-white">Total:</span>
                <span className="text-xl md:text-2xl font-bold text-[#0D6B4D]">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-[#0D6B4D]/20 border border-[#0D6B4D]/40 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-[#0D6B4D] text-xs md:text-sm">
                {subscriptionProducts.length > 0 && (
                  <>You have {subscriptionProducts.length} active subscription{subscriptionProducts.length > 1 ? 's' : ''}. </>
                )}
                All products have been added to your account. Check your email for confirmation details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const savings = currentNode.original_price && currentNode.price
    ? currentNode.original_price - currentNode.price
    : 0;

  const custom = currentNode.customization || {};
  const getHeaderTitle = () => {
    if (custom.headerTitle) return custom.headerTitle;
    const emoji = custom.headerEmoji || (currentNode.node_type === 'upsell' ? '🎉' : currentNode.node_type === 'downsell' ? '🎁' : '💎');
    return `${emoji} ${currentNode.node_type === 'upsell' ? 'Thank You For Your Purchase!' : currentNode.node_type === 'downsell' ? 'Special Offer Just For You!' : 'Exclusive Offer!'}`;
  };
  const getHeaderSubtitle = () => {
    if (custom.headerSubtitle) return custom.headerSubtitle;
    return currentNode.node_type === 'upsell' ? 'Wait! Before you go, we have an exclusive offer...' :
           currentNode.node_type === 'downsell' ? 'We have one more exclusive offer...' :
           'Don\'t miss out on this opportunity...';
  };
  const getAcceptButtonText = () => {
    if (custom.acceptButtonText) return custom.acceptButtonText;
    return `Yes! Add to My Order - $${currentNode.price?.toFixed(2) || '0.00'}`;
  };
  const getButtonStyle = () => {
    switch (custom.buttonStyle) {
      case 'square': return 'rounded-none';
      case 'rounded': return 'rounded-lg';
      case 'pill':
      default: return 'rounded-full';
    }
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

        {/* Offer Content */}
        <div className="p-4 md:p-6 lg:p-8">
          <div className="text-center mb-4 md:mb-6">
            {custom.productImageUrl && (
              <div className="mb-4 md:mb-6 flex justify-center">
                <img 
                  src={custom.productImageUrl} 
                  alt={currentNode.title || 'Product'} 
                  className="max-w-full h-32 md:h-40 lg:h-48 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-2 md:mb-3" style={{ color: custom.textColor || '#ffffff' }}>
              {currentNode.title || 'Special Offer'}
            </h2>
            <p className="text-base md:text-lg mb-3 md:mb-4" style={{ color: custom.textColor || '#ffffff', opacity: 0.8 }}>
              {currentNode.description || 'Get this amazing product at a special price!'}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: custom.primaryColor || '#0D6B4D' }}>
                  ${currentNode.price?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs md:text-sm mt-1" style={{ color: custom.textColor || '#ffffff', opacity: 0.7 }}>
                  {custom.priceLabel || 'One-time Price'}
                </div>
              </div>
              {savings > 0 && currentNode.original_price && (
                <>
                  <div className="hidden sm:block" style={{ color: custom.textColor || '#ffffff', opacity: 0.6 }}>vs</div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold line-through" style={{ color: custom.textColor || '#ffffff', opacity: 0.6 }}>
                      ${currentNode.original_price.toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm mt-1" style={{ color: custom.textColor || '#ffffff', opacity: 0.7 }}>
                      {custom.originalPriceLabel || 'Regular Price'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {savings > 0 && (
              <div 
                className="border rounded-lg p-3 md:p-4 mb-4 md:mb-6"
                style={{
                  backgroundColor: `${custom.primaryColor || '#0D6B4D'}20`,
                  borderColor: `${custom.primaryColor || '#0D6B4D'}40`
                }}
              >
                <p className="font-semibold text-sm md:text-base" style={{ color: custom.textColor || '#ffffff' }}>
                  💰 You Save ${savings.toFixed(2)}!
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-red-400 text-xs md:text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <button
              onClick={handleAccept}
              disabled={isProcessing || edgesLoading}
              className={`flex-1 font-bold py-3 md:py-4 px-4 md:px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg min-h-[44px] cursor-pointer ${getButtonStyle()}`}
              style={{
                backgroundColor: custom.primaryColor || '#0D6B4D',
                color: custom.buttonTextColor || '#ffffff'
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && !edgesLoading) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isProcessing ? 'Processing...' : getAcceptButtonText()}
            </button>
            <button
              onClick={handleDecline}
              disabled={isProcessing || edgesLoading}
              className={`flex-1 font-semibold py-3 md:py-4 px-4 md:px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] cursor-pointer ${getButtonStyle()}`}
              style={{
                backgroundColor: custom.secondaryButtonColor || '#3a3a3a',
                color: custom.buttonTextColor || '#ffffff'
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && !edgesLoading) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {custom.declineButtonText || 'No Thanks'}
            </button>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 md:mt-8 text-center">
            <p className="text-xs md:text-sm px-2" style={{ color: custom.textColor || '#ffffff', opacity: 0.6 }}>
              {custom.trustBadgeText || '🔒 Secure one-click checkout • No need to enter payment details again'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
        <div className="text-white text-sm md:text-base">Loading...</div>
      </div>
    }>
      <UpsellContent />
    </Suspense>
  );
}

