(function() {
  // Get base URL and parameters from the script's src
  function getBaseUrl() {
    const scripts = document.getElementsByTagName('script');
    let scriptUrl = null;
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('/embed.js')) {
        scriptUrl = src;
        const url = new URL(src);
        return { origin: url.origin, fullUrl: src };
      }
    }
    // Fallback to current origin if script src not found
    return { origin: window.location.origin, fullUrl: null };
  }

  const baseUrlInfo = getBaseUrl();
  const baseUrl = baseUrlInfo.origin;
  const scriptUrl = baseUrlInfo.fullUrl;

  // Store iframe references for redirect handling
  const iframeMap = new Map();
  
  // Flag to prevent multiple initializations
  let isInitialized = false;
  const processedContainers = new Set();

  // Store parent URL if we can get it via postMessage
  let parentUrlCache = null;

  // Listen for URL response from parent (when we request it)
  window.addEventListener('message', function(event) {
    // Handle parent URL response
    if (event.data && event.data.type === 'xperience-url-response') {
      parentUrlCache = event.data.url;
      return;
    }
  });

  // Request parent URL via postMessage
  function requestParentUrl() {
    if (window.parent === window) return null;
    
    try {
      window.parent.postMessage({ type: 'xperience-request-url' }, '*');
    } catch (e) {
      // Can't send message
    }
    return null;
  }

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

  // Helper to parse URL parameters from a URL string
  function parseUrlParamsFromString(urlString) {
    const params = {};
    if (!urlString) return params;
    
    try {
      const url = new URL(urlString);
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } catch (e) {
      // Fallback manual parsing
      const queryIndex = urlString.indexOf('?');
      if (queryIndex >= 0) {
        const query = urlString.substring(queryIndex + 1);
        query.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }
    }
    
    return params;
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

  // Request URL from parent window via postMessage (for cross-origin iframes)
  function requestUrlFromParent() {
    return new Promise((resolve) => {
      if (window.parent === window) {
        resolve(null);
        return;
      }
      
      const timeout = setTimeout(() => {
        resolve(null);
      }, 500);
      
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'xperience-url-response') {
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
          resolve(event.data.url);
        }
      };
      
      window.addEventListener('message', messageHandler);
      window.parent.postMessage({ type: 'xperience-request-url' }, '*');
    });
  }

  // Get URL parameters from multiple sources
  async function getAllUrlParams(scriptUrlParam) {
    const allParams = {};
    
    // First, try script tag URL if provided (most reliable)
    if (scriptUrlParam) {
      try {
        const scriptParams = parseUrlParamsFromString(scriptUrlParam);
        Object.assign(allParams, scriptParams);
      } catch (e) {
        console.warn('Could not parse script URL:', e);
      }
    }
    
    // Try current window location (if not srcdoc)
    try {
      if (window.location.href && window.location.href !== 'about:srcdoc' && window.location.href !== 'about:blank') {
        const currentParams = parseUrlParamsFromString(window.location.href);
        Object.assign(allParams, currentParams);
      }
    } catch (e) {
      console.warn('Could not parse current location:', e);
    }
    
    // Try parent window if we're in an iframe (and same-origin)
    try {
      if (window.parent && window.parent !== window) {
        if (window.parent.location.href && window.parent.location.href !== 'about:srcdoc' && window.parent.location.href !== 'about:blank') {
          const parentParams = parseUrlParamsFromString(window.parent.location.href);
          Object.assign(allParams, parentParams);
        }
      }
    } catch (e) {
      // Cross-origin, can't access parent directly - try postMessage
      if (window.parent !== window) {
        try {
          const parentUrl = await requestUrlFromParent();
          if (parentUrl) {
            const parentParams = parseUrlParamsFromString(parentUrl);
            Object.assign(allParams, parentParams);
          }
        } catch (e) {
          // Ignore
        }
      }
    }
    
    // Try top window (most reliable for getting the actual page URL)
    try {
      if (window.top && window.top.location.href && window.top.location.href !== 'about:srcdoc' && window.top.location.href !== 'about:blank') {
        const topParams = parseUrlParamsFromString(window.top.location.href);
        // Top window takes priority - merge it last so it overwrites
        Object.keys(topParams).forEach(key => {
          allParams[key] = topParams[key];
        });
      }
    } catch (e) {
      // Cross-origin, can't access top - that's expected for cross-origin iframes
    }
    
    // Try document.referrer as fallback
    if (document.referrer) {
      try {
        const referrerParams = parseUrlParamsFromString(document.referrer);
        Object.assign(allParams, referrerParams);
      } catch (e) {
        // Ignore
      }
    }
    
    // Also check any existing iframes on the page for their src URLs
    try {
      document.querySelectorAll('iframe[src*="upsell"], iframe[src*="checkout"], iframe[src*="confirmation"]').forEach(iframe => {
        if (iframe.src) {
          try {
            const iframeParams = parseUrlParamsFromString(iframe.src);
            Object.assign(allParams, iframeParams);
          } catch (e) {
            // Ignore
          }
        }
      });
    } catch (e) {
      // Ignore
    }
    
    return allParams;
  }

  // Wait for DOM to be ready
  async function init() {
    // Prevent multiple initializations
    if (isInitialized) {
      console.log('Xperience Embed: Already initialized, skipping...');
      return;
    }
    
    // Get URL params from all possible sources (including script URL)
    const allParams = await getAllUrlParams(scriptUrl);
    
    // Also try standard URLSearchParams from current location
    let urlParams;
    try {
      urlParams = new URLSearchParams(window.location.search);
    } catch (e) {
      urlParams = { get: () => null };
    }
    
    // Also try manual parsing from current location
    const manualParams = parseUrlParams();
    
    // Merge all sources - prioritize allParams (which includes top window), then current location
    const urlCompanyId = allParams.companyId || urlParams.get('companyId') || manualParams.companyId;
    const urlFlowId = allParams.flowId || urlParams.get('flowId') || manualParams.flowId;
    const urlNodeId = allParams.nodeId || urlParams.get('nodeId') || manualParams.nodeId;
    const urlMemberId = allParams.memberId || urlParams.get('memberId') || manualParams.memberId;
    const urlSetupIntentId = allParams.setupIntentId || urlParams.get('setupIntentId') || manualParams.setupIntentId;
    
    // Debug: log all param sources
    console.log('Xperience Embed - Param sources:', {
      currentLocation: window.location.href,
      currentSearch: window.location.search,
      allParams: allParams,
      finalParams: {
        companyId: urlCompanyId,
        flowId: urlFlowId,
        nodeId: urlNodeId,
        memberId: urlMemberId,
        setupIntentId: urlSetupIntentId,
      },
      inIframe: window.parent !== window,
      referrer: document.referrer,
    });
    
    // Determine page type from URL params
    const pathname = window.location.pathname || '';
    const isCheckoutPath = pathname.includes('checkout');
    const isUpsellPath = pathname.includes('upsell');
    const isConfirmationPath = pathname.includes('confirmation') || pathname.includes('thankyou');
    
    const hasCheckoutParams = urlCompanyId && !urlNodeId && !urlMemberId;
    const hasUpsellParams = urlCompanyId && urlFlowId && (urlNodeId || isUpsellPath);
    // Only show confirmation if we're on a confirmation path OR if we have memberId but NO nodeId (meaning we're done with upsells)
    const hasConfirmationParams = urlCompanyId && urlMemberId && (!urlNodeId && !isUpsellPath && !isCheckoutPath) || isConfirmationPath;
    
    // Find all embed containers
    let checkoutContainers = document.querySelectorAll('[data-xperience-checkout]');
    let upsellContainers = document.querySelectorAll('[data-xperience-upsell]');
    let confirmationContainers = document.querySelectorAll('[data-xperience-confirmation]');

    // Auto-create containers based on URL params if none exist (for external page embeds)
    if (checkoutContainers.length === 0 && hasCheckoutParams) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-checkout', '');
      autoContainer.style.width = '100%';
      autoContainer.style.height = '100%';
      autoContainer.style.minWidth = '320px';
      document.body.appendChild(autoContainer);
      checkoutContainers = document.querySelectorAll('[data-xperience-checkout]');
    }
    
    // Create upsell container if we have companyId and flowId (nodeId might come later)
    // Also check pathname to see if we're on an upsell page
    // Don't create if we're on confirmation path
    if (upsellContainers.length === 0 && hasUpsellParams && !isConfirmationPath) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-upsell', '');
      // Also set the params as data attributes so they're available when processing
      if (urlCompanyId) autoContainer.setAttribute('data-company-id', urlCompanyId);
      if (urlFlowId) autoContainer.setAttribute('data-flow-id', urlFlowId);
      if (urlNodeId) autoContainer.setAttribute('data-node-id', urlNodeId);
      if (urlMemberId) autoContainer.setAttribute('data-member-id', urlMemberId);
      if (urlSetupIntentId) autoContainer.setAttribute('data-setup-intent-id', urlSetupIntentId);
      autoContainer.style.width = '100%';
      autoContainer.style.height = '100%';
      autoContainer.style.minWidth = '320px';
      document.body.appendChild(autoContainer);
      upsellContainers = document.querySelectorAll('[data-xperience-upsell]');
    }
    
    // Only auto-create confirmation container if we're actually on a confirmation page
    // Don't create it on upsell or checkout pages - ONLY on confirmation/thankyou paths
    if (confirmationContainers.length === 0 && hasConfirmationParams && isConfirmationPath) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-confirmation', '');
      autoContainer.style.width = '100%';
      autoContainer.style.height = '100%';
      autoContainer.style.minWidth = '320px';
      document.body.appendChild(autoContainer);
      confirmationContainers = document.querySelectorAll('[data-xperience-confirmation]');
    }

    // Helper function to make container fill its parent
    function makeContainerFillParent(container) {
      const parent = container.parentElement;
      if (!parent) return;
      
      // If parent has a computed height, use it
      const parentHeight = window.getComputedStyle(parent).height;
      if (parentHeight && parentHeight !== 'auto' && parentHeight !== '0px') {
        container.style.height = parentHeight;
        return;
      }
      
      // Try to get parent's offsetHeight
      if (parent.offsetHeight && parent.offsetHeight > 0) {
        container.style.height = parent.offsetHeight + 'px';
        return;
      }
      
      // Fallback: use viewport height or parent's scrollHeight
      const height = parent.scrollHeight > 0 ? parent.scrollHeight : window.innerHeight;
      container.style.height = Math.max(height, 600) + 'px';
      
      // Watch for parent size changes
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
          for (const entry of entries) {
            const newHeight = entry.contentRect.height;
            if (newHeight > 0) {
              container.style.height = Math.max(newHeight, 600) + 'px';
            }
          }
        });
        resizeObserver.observe(parent);
      }
    }

    // Process checkout embeds
    checkoutContainers.forEach(container => {
      // Make container fill its parent
      makeContainerFillParent(container);
      
      // Ensure container has width and min-height
      if (!container.style.width || container.style.width === '') {
        container.style.width = '100%';
      }
      
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
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      
      // Add iframe attributes for better cross-origin compatibility
      iframe.setAttribute('allow', 'payment; fullscreen; camera; microphone');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });

    // Process upsell embeds
    upsellContainers.forEach(container => {
      // Make container fill its parent
      makeContainerFillParent(container);
      
      // Ensure container has width and min-height
      if (!container.style.width || container.style.width === '') {
        container.style.width = '100%';
      }
      
      // Skip if already processed or already has an iframe
      if (processedContainers.has(container) || container.querySelector('iframe')) {
        return;
      }
      processedContainers.add(container);
      
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
      
      if (!companyId || !flowId) {
        const missing = [];
        if (!companyId) missing.push('companyId');
        if (!flowId) missing.push('flowId');
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing required parameters: ${missing.join(', ')}. URL: ${window.location.href}</div>`;
        return;
      }

      // If nodeId is missing, we'll let the upsell page handle it
      // It can read nodeId from the parent page URL or from its own URL
      if (!nodeId) {
        console.warn('Xperience Embed: nodeId not found. Upsell page will need to read it from URL parameters.');
      }

      const iframe = document.createElement('iframe');
      
      // Start with required params
      let url = `${baseUrl}/upsell?companyId=${companyId}&flowId=${flowId}`;
      
      // Add all other parameters from allParams (which includes top window URL)
      // This ensures we pass through ALL parameters we found, not just the known ones
      Object.keys(allParams).forEach(key => {
        const value = allParams[key];
        if (value && !url.includes(`${key}=`)) {
          url += `&${key}=${encodeURIComponent(value)}`;
        }
      });
      
      // Also explicitly add our known params if they exist (in case allParams missed them)
      if (nodeId && !url.includes('nodeId=')) url += `&nodeId=${encodeURIComponent(nodeId)}`;
      if (memberId && !url.includes('memberId=')) url += `&memberId=${encodeURIComponent(memberId)}`;
      if (setupIntentId && !url.includes('setupIntentId=')) url += `&setupIntentId=${encodeURIComponent(setupIntentId)}`;
      
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      
      // Add iframe attributes for better cross-origin compatibility
      iframe.setAttribute('allow', 'payment; fullscreen; camera; microphone');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });

    // Process confirmation embeds
    confirmationContainers.forEach(container => {
      // Make container fill its parent
      makeContainerFillParent(container);
      
      // Ensure container has width and min-height
      if (!container.style.width || container.style.width === '') {
        container.style.width = '100%';
      }
      
      // Skip if already processed or already has an iframe
      if (processedContainers.has(container) || container.querySelector('iframe')) {
        return;
      }
      processedContainers.add(container);
      
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
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      
      // Add iframe attributes for better cross-origin compatibility (especially for Framer)
      iframe.setAttribute('allow', 'payment; fullscreen; camera; microphone');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      
      // Try to detect if we're in Framer and add additional attributes
      const isFramer = window.location.hostname.includes('framer') || 
                       window.location.hostname.includes('framerusercontent') ||
                       document.referrer.includes('framer');
      
      if (isFramer) {
        // Framer may need explicit sandbox permissions
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
        console.log('Detected Framer environment, added sandbox permissions');
      }
      
      container.appendChild(iframe);
      
      // Store iframe reference for redirect handling
      iframeMap.set(container, iframe);
    });
    
    // Mark as initialized after processing all containers
    isInitialized = true;
  }

  // Run initialization - try multiple times to ensure it works
  function runInit() {
    // Don't run if already initialized
    if (isInitialized) {
      return;
    }
    
    try {
      init();
    } catch (error) {
      console.error('Xperience Embed initialization error:', error);
      // Only retry once if initialization failed
      if (!isInitialized) {
        setTimeout(() => {
          if (!isInitialized) {
            try {
              init();
            } catch (retryError) {
              console.error('Xperience Embed retry failed:', retryError);
            }
          }
        }, 500);
      }
    }
  }

  // Only run initialization once
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    // If already loaded, run immediately
    runInit();
  }
})();
