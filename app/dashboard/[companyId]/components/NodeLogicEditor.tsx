'use client';

import { useState, useEffect } from 'react';

interface FlowNode {
  id: string;
  node_type: 'upsell' | 'downsell' | 'cross_sell';
  title: string | null;
}

interface NodeLogicEditorProps {
  nodeId: string;
  flowId: string;
  companyId: string;
  availableNodes: FlowNode[];
  confirmationPageUrl: string | null;
  onClose: () => void;
  onSave: () => void;
}

interface LogicConfig {
  accept: {
    type: 'node' | 'confirmation' | 'external_url';
    targetId: string | null;
    targetUrl: string | null;
  };
  decline: {
    type: 'node' | 'confirmation' | 'external_url';
    targetId: string | null;
    targetUrl: string | null;
  };
}

export default function NodeLogicEditor({
  nodeId,
  flowId,
  companyId,
  availableNodes,
  confirmationPageUrl,
  onClose,
  onSave,
}: NodeLogicEditorProps) {
  const [logic, setLogic] = useState<LogicConfig>({
    accept: { type: 'node', targetId: null, targetUrl: null },
    decline: { type: 'node', targetId: null, targetUrl: null },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogic = async () => {
      try {
        const response = await fetch(`/api/flows/${companyId}/edges?flowId=${flowId}&nodeId=${nodeId}`);
        if (response.ok) {
          const edges = await response.json();
          const acceptEdge = edges.find((e: any) => e.action === 'accept');
          const declineEdge = edges.find((e: any) => e.action === 'decline');
          
          setLogic({
            accept: {
              type: acceptEdge?.target_type || 'node',
              targetId: acceptEdge?.to_node_id || null,
              targetUrl: acceptEdge?.target_url || null,
            },
            decline: {
              type: declineEdge?.target_type || 'node',
              targetId: declineEdge?.to_node_id || null,
              targetUrl: declineEdge?.target_url || null,
            },
          });
        }
      } catch (error) {
        console.error('Error loading logic:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogic();
  }, [nodeId, flowId, companyId]);

  const handleSave = async () => {
    try {
      // Delete existing edges
      await fetch(`/api/flows/${companyId}/edges?flowId=${flowId}&nodeId=${nodeId}`, {
        method: 'DELETE',
      });

      // Create new edges
      const edges = [];
      if (logic.accept.type === 'node' && logic.accept.targetId) {
        edges.push({
          from_node_id: nodeId,
          to_node_id: logic.accept.targetId,
          action: 'accept',
          flow_id: flowId,
          target_type: 'node',
        });
      } else if (logic.accept.type === 'confirmation') {
        edges.push({
          from_node_id: nodeId,
          action: 'accept',
          flow_id: flowId,
          target_type: 'confirmation',
          target_url: confirmationPageUrl,
        });
      } else if (logic.accept.type === 'external_url' && logic.accept.targetUrl) {
        edges.push({
          from_node_id: nodeId,
          action: 'accept',
          flow_id: flowId,
          target_type: 'external_url',
          target_url: logic.accept.targetUrl,
        });
      }

      if (logic.decline.type === 'node' && logic.decline.targetId) {
        edges.push({
          from_node_id: nodeId,
          to_node_id: logic.decline.targetId,
          action: 'decline',
          flow_id: flowId,
          target_type: 'node',
        });
      } else if (logic.decline.type === 'confirmation') {
        edges.push({
          from_node_id: nodeId,
          action: 'decline',
          flow_id: flowId,
          target_type: 'confirmation',
          target_url: confirmationPageUrl,
        });
      } else if (logic.decline.type === 'external_url' && logic.decline.targetUrl) {
        edges.push({
          from_node_id: nodeId,
          action: 'decline',
          flow_id: flowId,
          target_type: 'external_url',
          target_url: logic.decline.targetUrl,
        });
      }

      for (const edge of edges) {
        await fetch(`/api/flows/${companyId}/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edge),
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving logic:', error);
      alert('Error saving logic configuration');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-a1/80 dark:bg-gray-a1/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-a2 border border-gray-a4 rounded-xl p-6">
          <div className="text-gray-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-a1/80 dark:bg-gray-a1/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-a2 border border-gray-a4 rounded-xl p-6 w-full max-w-2xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-12">Configure Accept/Decline Logic</h2>
          <button
            onClick={onClose}
            className="text-gray-10 hover:text-gray-12 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Accept Logic */}
          <div>
            <h3 className="text-lg font-semibold text-gray-12 mb-4">When User Accepts:</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Action Type</label>
                <select
                  value={logic.accept.type}
                  onChange={(e) => setLogic({
                    ...logic,
                    accept: { ...logic.accept, type: e.target.value as any, targetId: null, targetUrl: null }
                  })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                >
                  <option value="node">Go to Another Upsell/Downsell</option>
                  <option value="confirmation">Go to Confirmation Page</option>
                  <option value="external_url">Redirect to External URL</option>
                </select>
              </div>
              {logic.accept.type === 'node' && (
                <div>
                  <label className="block text-gray-12 font-semibold mb-2 text-sm">Select Next Node</label>
                  <select
                    value={logic.accept.targetId || ''}
                    onChange={(e) => setLogic({
                      ...logic,
                      accept: { ...logic.accept, targetId: e.target.value || null }
                    })}
                    className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  >
                    <option value="">Select a node...</option>
                    {availableNodes.filter(n => n.id !== nodeId).map(node => (
                      <option key={node.id} value={node.id}>
                        {node.title || `${node.node_type} (${node.id.substring(0, 8)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {logic.accept.type === 'external_url' && (
                <div>
                  <label className="block text-gray-12 font-semibold mb-2 text-sm">External URL</label>
                  <input
                    type="url"
                    value={logic.accept.targetUrl || ''}
                    onChange={(e) => setLogic({
                      ...logic,
                      accept: { ...logic.accept, targetUrl: e.target.value || null }
                    })}
                    placeholder="https://example.com/thank-you"
                    className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Decline Logic */}
          <div>
            <h3 className="text-lg font-semibold text-gray-12 mb-4">When User Declines:</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-12 font-semibold mb-2 text-sm">Action Type</label>
                <select
                  value={logic.decline.type}
                  onChange={(e) => setLogic({
                    ...logic,
                    decline: { ...logic.decline, type: e.target.value as any, targetId: null, targetUrl: null }
                  })}
                  className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                >
                  <option value="node">Go to Another Upsell/Downsell</option>
                  <option value="confirmation">Go to Confirmation Page</option>
                  <option value="external_url">Redirect to External URL</option>
                </select>
              </div>
              {logic.decline.type === 'node' && (
                <div>
                  <label className="block text-gray-12 font-semibold mb-2 text-sm">Select Next Node</label>
                  <select
                    value={logic.decline.targetId || ''}
                    onChange={(e) => setLogic({
                      ...logic,
                      decline: { ...logic.decline, targetId: e.target.value || null }
                    })}
                    className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  >
                    <option value="">Select a node...</option>
                    {availableNodes.filter(n => n.id !== nodeId).map(node => (
                      <option key={node.id} value={node.id}>
                        {node.title || `${node.node_type} (${node.id.substring(0, 8)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {logic.decline.type === 'external_url' && (
                <div>
                  <label className="block text-gray-12 font-semibold mb-2 text-sm">External URL</label>
                  <input
                    type="url"
                    value={logic.decline.targetUrl || ''}
                    onChange={(e) => setLogic({
                      ...logic,
                      decline: { ...logic.decline, targetUrl: e.target.value || null }
                    })}
                    placeholder="https://example.com/thank-you"
                    className="w-full bg-white dark:bg-gray-a3 border border-gray-a4 rounded-lg px-4 py-2 text-gray-12"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-6 mt-6 border-t border-gray-a4">
          <button
            onClick={handleSave}
            className="flex-1 bg-accent-500 hover:bg-accent-600 text-gray-12 font-semibold py-3 rounded-lg"
          >
            Save Logic
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-a3 hover:bg-gray-a4 text-gray-12 font-semibold py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

