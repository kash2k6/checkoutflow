import { useState } from 'react';
import { CheckCircle2, ArrowUp, ArrowDown, ArrowLeftRight, Save } from 'lucide-react';
import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import SectionHeader from './SectionHeader';
import NodeCard from './NodeCard';
import ConnectorLine from './ConnectorLine';
import AddButton from './AddButton';

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
  id?: string;
  nodes: FlowNode[];
}

interface WhopPlan {
  id: string;
  title: string;
}

interface StepUpsellsDownsellsProps {
  flow: CompanyFlow | null;
  plans: WhopPlan[];
  onAddNode: (type: 'upsell' | 'downsell' | 'cross_sell') => void;
  onEditNode: (node: FlowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onLogicNode: (node: FlowNode) => void;
  onSave: () => Promise<void>;
}

export default function StepUpsellsDownsells({
  flow,
  plans,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onLogicNode,
  onSave,
}: StepUpsellsDownsellsProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving flow:', error);
    } finally {
      setSaving(false);
    }
  };
  const upsellNodes = (flow?.nodes || [])
    .filter(n => n.node_type === 'upsell')
    .sort((a, b) => a.order_index - b.order_index);
  const downsellNodes = (flow?.nodes || [])
    .filter(n => n.node_type === 'downsell')
    .sort((a, b) => a.order_index - b.order_index);
  const crossSellNodes = (flow?.nodes || [])
    .filter(n => n.node_type === 'cross_sell')
    .sort((a, b) => a.order_index - b.order_index);

  const getProductName = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.title || 'Unknown Product';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-12 mb-2">Upsells & Downsells</h1>
        <p className="text-gray-600">Build your funnel flow with upsells, downsells, and cross-sells</p>
      </div>

      <div className="space-y-6">
        {/* Initial Purchase Node */}
        <FrostedCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-gray-12" />
            </div>
            <div>
              <div className="text-sm font-semibold text-accent-500 uppercase tracking-wide mb-1">
                Initial Purchase
              </div>
              <div className="text-base font-semibold text-gray-12">
                Checkout (Initial Purchase)
              </div>
            </div>
          </div>
        </FrostedCard>

        <ConnectorLine />

        {/* Upsells Section */}
        <div>
          <SectionHeader
            title="Upsells"
            icon={ArrowUp}
            className="mb-4"
          >
            <AddButton
              onClick={() => onAddNode('upsell')}
              label="Add Upsell"
            />
          </SectionHeader>
          <div className="space-y-4">
            {upsellNodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-[#E5E6EA]">
                No upsells configured. Click "Add Upsell" to get started.
              </div>
            ) : (
              upsellNodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  productName={getProductName(node.plan_id)}
                  onConfigure={() => onEditNode(node)}
                  onLogic={() => onLogicNode(node)}
                  onDelete={() => onDeleteNode(node.id)}
                />
              ))
            )}
          </div>
        </div>

        <ConnectorLine />

        {/* Downsells Section */}
        <div>
          <SectionHeader
            title="Downsells"
            icon={ArrowDown}
            className="mb-4"
          >
            <AddButton
              onClick={() => onAddNode('downsell')}
              label="Add Downsell"
            />
          </SectionHeader>
          <div className="space-y-4">
            {downsellNodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-[#E5E6EA]">
                No downsells configured. Click "Add Downsell" to get started.
              </div>
            ) : (
              downsellNodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  productName={getProductName(node.plan_id)}
                  onConfigure={() => onEditNode(node)}
                  onLogic={() => onLogicNode(node)}
                  onDelete={() => onDeleteNode(node.id)}
                />
              ))
            )}
          </div>
        </div>

        <ConnectorLine />

        {/* Cross-Sells Section */}
        <div>
          <SectionHeader
            title="Cross-Sells"
            icon={ArrowLeftRight}
            className="mb-4"
          >
            <AddButton
              onClick={() => onAddNode('cross_sell')}
              label="Add Cross-Sell"
            />
          </SectionHeader>
          <div className="space-y-4">
            {crossSellNodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-[#E5E6EA]">
                No cross-sells configured. Click "Add Cross-Sell" to get started.
              </div>
            ) : (
              crossSellNodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  productName={getProductName(node.plan_id)}
                  onConfigure={() => onEditNode(node)}
                  onLogic={() => onLogicNode(node)}
                  onDelete={() => onDeleteNode(node.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <FrostedButton
            onClick={handleSave}
            icon={Save}
            variant="accent"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Flow'}
          </FrostedButton>
        </div>
      </div>
    </div>
  );
}

