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
    // Verify message is from our domain
    if (event.origin !== baseUrl.replace(/\/$/, '')) {
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
    // Find all embed containers
    const checkoutContainers = document.querySelectorAll('[data-xperience-checkout]');
    const upsellContainers = document.querySelectorAll('[data-xperience-upsell]');
    const confirmationContainers = document.querySelectorAll('[data-xperience-confirmation]');

    // Process checkout embeds
    checkoutContainers.forEach(container => {
      const companyId = container.getAttribute('data-company-id');
      const flowId = container.getAttribute('data-flow-id');
      
      if (!companyId) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing companyId attribute</div>';
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
      const companyId = container.getAttribute('data-company-id');
      const flowId = container.getAttribute('data-flow-id');
      const nodeId = container.getAttribute('data-node-id') || new URLSearchParams(window.location.search).get('nodeId');
      const memberId = container.getAttribute('data-member-id') || new URLSearchParams(window.location.search).get('memberId');
      const setupIntentId = container.getAttribute('data-setup-intent-id') || new URLSearchParams(window.location.search).get('setupIntentId');
      
      if (!companyId || !flowId || !nodeId) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing required attributes: companyId, flowId, and nodeId</div>';
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
      const companyId = container.getAttribute('data-company-id');
      const flowId = container.getAttribute('data-flow-id');
      const memberId = container.getAttribute('data-member-id') || new URLSearchParams(window.location.search).get('memberId');
      
      if (!companyId) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">⚠️ Missing companyId attribute</div>';
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

