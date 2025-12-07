'use client';

import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Dialog } from '@whop/react/components';
import FrostedCard from './UpsellFlowBuilder/FrostedCard';

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  flowId: string;
  flowName: string | null;
}

export default function EmbedCodeModal({
  isOpen,
  onClose,
  companyId,
  flowId,
  flowName,
}: EmbedCodeModalProps) {
  const [embedCodes, setEmbedCodes] = useState<{
    checkout: string;
    upsell: string;
    confirmation: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companyId && flowId) {
      fetchEmbedCodes();
    }
  }, [isOpen, companyId, flowId]);

  const fetchEmbedCodes = async () => {
    setLoading(true);
    try {
      const baseUrl = window.location.origin;
      
      const [checkoutRes, upsellRes, confirmationRes] = await Promise.all([
        fetch(`/api/embed/${companyId}?type=checkout&flowId=${flowId}`),
        fetch(`/api/embed/${companyId}?type=upsell&flowId=${flowId}`),
        fetch(`/api/embed/${companyId}?type=confirmation&flowId=${flowId}`),
      ]);

      const checkoutData = await checkoutRes.json();
      const upsellData = await upsellRes.json();
      const confirmationData = await confirmationRes.json();

      setEmbedCodes({
        checkout: checkoutData.embedCode || '',
        upsell: upsellData.embedCode || '',
        confirmation: confirmationData.embedCode || '',
      });
    } catch (error) {
      console.error('Error fetching embed codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content 
        size="3" 
        style={{ maxWidth: '56rem', maxHeight: '90vh' }}
      >
        <Dialog.Title>Embed Code</Dialog.Title>
        <Dialog.Description>{flowName || 'Flow'}</Dialog.Description>

        <div className="flex-1 overflow-y-auto space-y-6" style={{ marginTop: 'var(--space-4)' }}>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
              <div className="text-gray-10">Loading embed codes...</div>
            </div>
          ) : embedCodes ? (
            <>
              {/* Checkout Embed */}
              <FrostedCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                      Checkout Page
                    </h3>
                    <p className="text-sm text-gray-10 dark:text-gray-9">
                      Embed this code on your checkout page
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCopy(embedCodes.checkout, 'checkout')}
                    color="gray"
                    variant="classic"
                    size="2"
                  >
                    {copiedType === 'checkout' ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-gray-a1 dark:bg-gray-a3 rounded-lg p-4 text-xs overflow-x-auto border border-gray-a4">
                  <code className="text-gray-12 dark:text-white">
                    {embedCodes.checkout}
                  </code>
                </pre>
              </FrostedCard>

              {/* Upsell Embed */}
              <FrostedCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                      Upsell Page
                    </h3>
                    <p className="text-sm text-gray-10 dark:text-gray-9">
                      Embed this code on your upsell page
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCopy(embedCodes.upsell, 'upsell')}
                    color="gray"
                    variant="classic"
                    size="2"
                  >
                    {copiedType === 'upsell' ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-gray-a1 dark:bg-gray-a3 rounded-lg p-4 text-xs overflow-x-auto border border-gray-a4">
                  <code className="text-gray-12 dark:text-white">
                    {embedCodes.upsell}
                  </code>
                </pre>
              </FrostedCard>

              {/* Confirmation Embed */}
              <FrostedCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                      Confirmation Page
                    </h3>
                    <p className="text-sm text-gray-10 dark:text-gray-9">
                      Embed this code on your confirmation page
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCopy(embedCodes.confirmation, 'confirmation')}
                    color="gray"
                    variant="classic"
                    size="2"
                  >
                    {copiedType === 'confirmation' ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-gray-a1 dark:bg-gray-a3 rounded-lg p-4 text-xs overflow-x-auto border border-gray-a4">
                  <code className="text-gray-12 dark:text-white">
                    {embedCodes.confirmation}
                  </code>
                </pre>
              </FrostedCard>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-10">Failed to load embed codes</p>
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

