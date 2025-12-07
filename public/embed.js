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

  // Wait for DOM to be ready
  function init() {
    // Get URL params once for all containers
    const urlParams = new URLSearchParams(window.location.search);
    
    // Determine page type from URL params or container presence
    const hasCheckoutParams = urlParams.get('companyId') && !urlParams.get('nodeId');
    const hasUpsellParams = urlParams.get('companyId') && urlParams.get('flowId') && urlParams.get('nodeId');
    const hasConfirmationParams = urlParams.get('companyId') && urlParams.get('memberId');
    
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
    
    if (upsellContainers.length === 0 && hasUpsellParams) {
      const autoContainer = document.createElement('div');
      autoContainer.setAttribute('data-xperience-upsell', '');
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
      const companyId = container.getAttribute('data-company-id') || urlParams.get('companyId');
      const flowId = container.getAttribute('data-flow-id') || urlParams.get('flowId');
      
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
      const companyId = container.getAttribute('data-company-id') || urlParams.get('companyId');
      const flowId = container.getAttribute('data-flow-id') || urlParams.get('flowId');
      const nodeId = container.getAttribute('data-node-id') || urlParams.get('nodeId');
      const memberId = container.getAttribute('data-member-id') || urlParams.get('memberId');
      const setupIntentId = container.getAttribute('data-setup-intent-id') || urlParams.get('setupIntentId');
      
      if (!companyId || !flowId || !nodeId) {
        const missing = [];
        if (!companyId) missing.push('companyId');
        if (!flowId) missing.push('flowId');
        if (!nodeId) missing.push('nodeId');
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing required parameters: ${missing.join(', ')}. Please add as URL parameters or data attributes.</div>`;
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
      const companyId = container.getAttribute('data-company-id') || urlParams.get('companyId');
      const flowId = container.getAttribute('data-flow-id') || urlParams.get('flowId');
      const memberId = container.getAttribute('data-member-id') || urlParams.get('memberId');
      
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

