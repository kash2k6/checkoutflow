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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

