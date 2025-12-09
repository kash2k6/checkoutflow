'use client';

import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Dialog } from '@whop/react/components';
import FrostedCard from './UpsellFlowBuilder/FrostedCard';

interface FlowNode {
  id: string;
  node_type: 'upsell' | 'downsell' | 'cross_sell';
  title: string | null;
  order_index: number;
}

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  flowId: string;
  flowName: string | null;
}

interface NodeEmbedCode {
  nodeId: string;
  nodeType: 'upsell' | 'downsell' | 'cross_sell';
  title: string | null;
  orderIndex: number;
  embedCode: string;
}

export default function EmbedCodeModal({
  isOpen,
  onClose,
  companyId,
  flowId,
  flowName,
}: EmbedCodeModalProps) {
  const [checkoutEmbed, setCheckoutEmbed] = useState<string>('');
  const [confirmationEmbed, setConfirmationEmbed] = useState<string>('');
  const [nodeEmbedCodes, setNodeEmbedCodes] = useState<NodeEmbedCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companyId && flowId) {
      fetchEmbedCodes();
    }
  }, [isOpen, companyId, flowId]);

  const fetchEmbedCodes = async () => {
    setLoading(true);
    try {
      // First, fetch the flow to get all nodes
      const flowRes = await fetch(`/api/flows/${companyId}?flowId=${flowId}`);
      if (!flowRes.ok) {
        throw new Error('Failed to fetch flow');
      }
      const flowData = await flowRes.json();
      const nodes: FlowNode[] = flowData.nodes || [];

      // Fetch checkout and confirmation embeds
      const [checkoutRes, confirmationRes] = await Promise.all([
        fetch(`/api/embed/${companyId}?type=checkout&flowId=${flowId}`),
        fetch(`/api/embed/${companyId}?type=confirmation&flowId=${flowId}`),
      ]);

      const checkoutData = await checkoutRes.json();
      const confirmationData = await confirmationRes.json();

      setCheckoutEmbed(checkoutData.embedCode || '');
      setConfirmationEmbed(confirmationData.embedCode || '');

      // Generate embed codes for each node
      const nodeEmbeds: NodeEmbedCode[] = [];
      for (const node of nodes) {
        const nodeType = node.node_type === 'cross_sell' ? 'cross_sell' : node.node_type;
        const embedRes = await fetch(
          `/api/embed/${companyId}?type=${nodeType}&flowId=${flowId}&nodeId=${node.id}`
        );
        const embedData = await embedRes.json();
        
        nodeEmbeds.push({
          nodeId: node.id,
          nodeType: node.node_type,
          title: node.title,
          orderIndex: node.order_index,
          embedCode: embedData.embedCode || '',
        });
      }

      // Sort by type then order_index
      nodeEmbeds.sort((a, b) => {
        const typeOrder = { upsell: 1, downsell: 2, cross_sell: 3 };
        if (typeOrder[a.nodeType] !== typeOrder[b.nodeType]) {
          return typeOrder[a.nodeType] - typeOrder[b.nodeType];
        }
        return a.orderIndex - b.orderIndex;
      });

      setNodeEmbedCodes(nodeEmbeds);
    } catch (error) {
      console.error('Error fetching embed codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Group nodes by type
  const upsellNodes = nodeEmbedCodes.filter(n => n.nodeType === 'upsell');
  const downsellNodes = nodeEmbedCodes.filter(n => n.nodeType === 'downsell');
  const crossSellNodes = nodeEmbedCodes.filter(n => n.nodeType === 'cross_sell');

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
          ) : (
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
                    onClick={() => handleCopy(checkoutEmbed, 'checkout')}
                    color="gray"
                    variant="classic"
                    size="2"
                  >
                    {copiedId === 'checkout' ? (
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
                    {checkoutEmbed}
                  </code>
                </pre>
              </FrostedCard>

              {/* Upsell Nodes */}
              {upsellNodes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-12 dark:text-white">
                    Upsell Pages
                  </h2>
                  {upsellNodes.map((node) => (
                    <FrostedCard key={node.nodeId}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                            {node.title || `Upsell ${node.orderIndex + 1}`}
                          </h3>
                          <p className="text-sm text-gray-10 dark:text-gray-9">
                            Embed this code for this specific upsell offer
                          </p>
                        </div>
                        <Button
                          onClick={() => handleCopy(node.embedCode, node.nodeId)}
                          color="gray"
                          variant="classic"
                          size="2"
                        >
                          {copiedId === node.nodeId ? (
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
                          {node.embedCode}
                        </code>
                      </pre>
                    </FrostedCard>
                  ))}
                </div>
              )}

              {/* Downsell Nodes */}
              {downsellNodes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-12 dark:text-white">
                    Downsell Pages
                  </h2>
                  {downsellNodes.map((node) => (
                    <FrostedCard key={node.nodeId}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                            {node.title || `Downsell ${node.orderIndex + 1}`}
                          </h3>
                          <p className="text-sm text-gray-10 dark:text-gray-9">
                            Embed this code for this specific downsell offer
                          </p>
                        </div>
                        <Button
                          onClick={() => handleCopy(node.embedCode, node.nodeId)}
                          color="gray"
                          variant="classic"
                          size="2"
                        >
                          {copiedId === node.nodeId ? (
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
                          {node.embedCode}
                        </code>
                      </pre>
                    </FrostedCard>
                  ))}
                </div>
              )}

              {/* Cross-Sell Nodes */}
              {crossSellNodes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-12 dark:text-white">
                    Cross-Sell Pages
                  </h2>
                  {crossSellNodes.map((node) => (
                    <FrostedCard key={node.nodeId}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-12 dark:text-white">
                            {node.title || `Cross-Sell ${node.orderIndex + 1}`}
                          </h3>
                          <p className="text-sm text-gray-10 dark:text-gray-9">
                            Embed this code for this specific cross-sell offer
                          </p>
                        </div>
                        <Button
                          onClick={() => handleCopy(node.embedCode, node.nodeId)}
                          color="gray"
                          variant="classic"
                          size="2"
                        >
                          {copiedId === node.nodeId ? (
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
                          {node.embedCode}
                        </code>
                      </pre>
                    </FrostedCard>
                  ))}
                </div>
              )}

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
                    onClick={() => handleCopy(confirmationEmbed, 'confirmation')}
                    color="gray"
                    variant="classic"
                    size="2"
                  >
                    {copiedId === 'confirmation' ? (
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
                    {confirmationEmbed}
                  </code>
                </pre>
              </FrostedCard>
            </>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

