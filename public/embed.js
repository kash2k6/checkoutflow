(function() {
  // Get base URL from the script's src
  function getBaseUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('/embed.js')) {
        const url = new URL(src);
        return url.origin;
      }
    }
    // Fallback to current origin if script src not found
    return window.location.origin;
  }

  const baseUrl = getBaseUrl();

  // Store iframe references for redirect handling
  const iframeMap = new Map();

  // Listen for redirect messages from iframes
  window.addEventListener('message', function(event) {
    // Verify message is from our domain (allow both with and without trailing slash)
    const baseUrlNormalized = baseUrl.replace(/\/$/, '');
    const eventOriginNormalized = event.origin.replace(/\/$/, '');
    if (eventOriginNormalized !== baseUrlNormalized) {
      return;
    }

    if (event.data && event.data.type === 'xperience-redirect') {
      // Find the iframe that sent this message
      iframeMap.forEach((iframe, container) => {
        if (iframe.contentWindow === event.source) {
          if (event.data.action === 'update-iframe') {
            // Update iframe src to show next page
            iframe.src = event.data.url;
          } else if (event.data.action === 'redirect-parent') {
            // Redirect entire parent page
            window.location.href = event.data.url;
          }
        }
      });
    }

    if (event.data && event.data.type === 'xperience-complete') {
      // Handle completion (could show a message or redirect)
      iframeMap.forEach((iframe, container) => {
        if (iframe.contentWindow === event.source) {
          // Optionally show completion message or redirect
          console.log('Checkout completed:', event.data.message);
          // You could also show a success message in the container
        }
      });
    }
  });

  // Helper function to get URL parameter
  function getUrlParam(key) {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }

  // Helper to parse URL parameters manually as fallback
  function parseUrlParams() {
    const params = {};
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    
    // Parse search params
    if (search) {
      search.substring(1).split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }
    
    // Parse hash params (some frameworks use hash for routing)
    if (hash && hash.includes('?')) {
      const hashQuery = hash.split('?')[1];
      hashQuery.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }
    
    return params;
  }

  // Wait for DOM to be ready
  function init() {
    // Get URL params - try URLSearchParams first, then manual parsing as fallback
    let urlParams;
    try {
      urlParams = new URLSearchParams(window.location.search);
    } catch (e) {
      console.warn('URLSearchParams failed, using manual parser:', e);
      const manualParams = parseUrlParams();
      urlParams = {
        get: (key) => manualParams[key] || null
      };
    }
    
    // Also try manual parsing as backup
    const manualParams = parseUrlParams();
    
    // Read all possible URL parameters - try URLSearchParams first, then manual
    const urlCompanyId = urlParams.get('companyId') || manualParams.companyId;
    const urlFlowId = urlParams.get('flowId') || manualParams.flowId;
    const urlNodeId = urlParams.get('nodeId') || manualParams.nodeId;
    const urlMemberId = urlParams.get('memberId') || manualParams.memberId;
    const urlSetupIntentId = urlParams.get('setupIntentId') || manualParams.setupIntentId;
    
    // Determine page type from URL params
    const hasCheckoutParams = urlCompanyId && !urlNodeId;
    const hasUpsellParams = urlCompanyId && urlFlowId && urlNodeId;
    const hasConfirmationParams = urlCompanyId && urlMemberId;
    
    // Find all embed containers
    let checkoutContainers = document.querySelectorAll('[data-xperience-checkout]');
    let upsellContainers = document.querySelectorAll('[data-xperience-upsell]');
    let confirmationContainers = document.querySelectorAll('[data-xperience-confirmation]');

    // Auto-create containers based on URL params if none exist (for external page embeds)
    if (checkoutContainers.length === 0 && hasCheckoutParams) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-checkout', '');
      autoContainer.style.width = '100%';
      autoContainer.style.minWidth = '320px';
      autoContainer.style.minHeight = '600px';
      document.body.appendChild(autoContainer);
      checkoutContainers = document.querySelectorAll('[data-xperience-checkout]');
    }
    
    // Only create upsell container if we have ALL required params
    if (upsellContainers.length === 0 && urlCompanyId && urlFlowId && urlNodeId) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-upsell', '');
      // Also set the params as data attributes so they're available when processing
      if (urlCompanyId) autoContainer.setAttribute('data-company-id', urlCompanyId);
      if (urlFlowId) autoContainer.setAttribute('data-flow-id', urlFlowId);
      if (urlNodeId) autoContainer.setAttribute('data-node-id', urlNodeId);
      if (urlMemberId) autoContainer.setAttribute('data-member-id', urlMemberId);
      if (urlSetupIntentId) autoContainer.setAttribute('data-setup-intent-id', urlSetupIntentId);
      autoContainer.style.width = '100%';
      autoContainer.style.minWidth = '320px';
      autoContainer.style.minHeight = '600px';
      document.body.appendChild(autoContainer);
      upsellContainers = document.querySelectorAll('[data-xperience-upsell]');
    }
    
    if (confirmationContainers.length === 0 && hasConfirmationParams) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-confirmation', '');
      autoContainer.style.width = '100%';
      autoContainer.style.minWidth = '320px';
      autoContainer.style.minHeight = '600px';
      document.body.appendChild(autoContainer);
      confirmationContainers = document.querySelectorAll('[data-xperience-confirmation]');
    }

    // Process checkout embeds
    checkoutContainers.forEach(container => {
      // Try data attributes first, then fallback to URL params
      const companyId = container.getAttribute('data-company-id') || urlCompanyId;
      const flowId = container.getAttribute('data-flow-id') || urlFlowId;
      
      if (!companyId) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing companyId. Please add data-company-id attribute or companyId URL parameter.</div>';
        return;
      }

      const iframe = document.createElement('iframe');
      let url = `${baseUrl}/checkout?companyId=${companyId}`;
      if (flowId) url += `&flowId=${flowId}`;
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.minHeight = '600px';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });

    // Process upsell embeds
    upsellContainers.forEach(container => {
      // Try data attributes first, then fallback to URL params
      const companyId = container.getAttribute('data-company-id') || urlCompanyId;
      const flowId = container.getAttribute('data-flow-id') || urlFlowId;
      const nodeId = container.getAttribute('data-node-id') || urlNodeId;
      const memberId = container.getAttribute('data-member-id') || urlMemberId;
      const setupIntentId = container.getAttribute('data-setup-intent-id') || urlSetupIntentId;
      
      // Debug logging
      console.log('Xperience Embed - Upsell params:', {
        companyId: companyId,
        flowId: flowId,
        nodeId: nodeId,
        memberId: memberId,
        setupIntentId: setupIntentId,
        url: window.location.href,
        search: window.location.search,
        fromDataAttrs: {
          companyId: container.getAttribute('data-company-id'),
          flowId: container.getAttribute('data-flow-id'),
          nodeId: container.getAttribute('data-node-id'),
        },
        fromUrlParams: {
          companyId: urlCompanyId,
          flowId: urlFlowId,
          nodeId: urlNodeId,
        }
      });
      
      if (!companyId || !flowId || !nodeId) {
        const missing = [];
        if (!companyId) missing.push('companyId');
        if (!flowId) missing.push('flowId');
        if (!nodeId) missing.push('nodeId');
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing required parameters: ${missing.join(', ')}. URL: ${window.location.href}</div>`;
        return;
      }

      const iframe = document.createElement('iframe');
      let url = `${baseUrl}/upsell?companyId=${companyId}&flowId=${flowId}&nodeId=${nodeId}`;
      if (memberId) url += `&memberId=${memberId}`;
      if (setupIntentId) url += `&setupIntentId=${setupIntentId}`;
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.minHeight = '600px';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });

    // Process confirmation embeds
    confirmationContainers.forEach(container => {
      // Try data attributes first, then fallback to URL params
      const companyId = container.getAttribute('data-company-id') || urlCompanyId;
      const flowId = container.getAttribute('data-flow-id') || urlFlowId;
      const memberId = container.getAttribute('data-member-id') || urlMemberId;
      
      if (!companyId) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing companyId. Please add data-company-id attribute or companyId URL parameter.</div>';
        return;
      }

      const iframe = document.createElement('iframe');
      let url = `${baseUrl}/confirmation?companyId=${companyId}`;
      if (flowId) url += `&flowId=${flowId}`;
      if (memberId) url += `&memberId=${memberId}`;
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.minHeight = '600px';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });
  }

  // Run initialization - try multiple times to ensure it works
  function runInit() {
    try {
      init();
    } catch (error) {
      console.error('Xperience Embed initialization error:', error);
      // Retry after a short delay
      setTimeout(() => {
        try {
          init();
        } catch (retryError) {
          console.error('Xperience Embed retry failed:', retryError);
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    // If already loaded, run immediately
    runInit();
  }
  
  // Also try running after a short delay in case DOM isn't fully ready
  setTimeout(runInit, 100);
})();
