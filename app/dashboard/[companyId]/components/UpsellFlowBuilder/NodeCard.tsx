import { Settings, Trash2, Code, ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import FrostedCard from './FrostedCard';

interface FlowNode {
  id: string;
  node_type: 'upsell' | 'downsell' | 'cross_sell';
  title: string | null;
  redirect_url: string;
  plan_id: string;
}

interface NodeCardProps {
  node: FlowNode;
  productName?: string;
  onConfigure: () => void;
  onLogic: () => void;
  onDelete: () => void;
}

export default function NodeCard({ node, productName, onConfigure, onLogic, onDelete }: NodeCardProps) {
  const getNodeTypeIcon = () => {
    switch (node.node_type) {
      case 'upsell':
        return ArrowUp;
      case 'downsell':
        return ArrowDown;
      case 'cross_sell':
        return ArrowLeftRight;
    }
  };

  const getNodeTypeLabel = () => {
    switch (node.node_type) {
      case 'upsell':
        return 'Upsell';
      case 'downsell':
        return 'Downsell';
      case 'cross_sell':
        return 'Cross-Sell';
    }
  };

  const getNodeTypeColor = () => {
    switch (node.node_type) {
      case 'upsell':
        return 'bg-accent-500';
      case 'downsell':
        return 'bg-accent-500';
      case 'cross_sell':
        return 'bg-accent-500';
    }
  };

  const Icon = getNodeTypeIcon();

  return (
    <FrostedCard className="hover:shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 w-full sm:w-auto">
          <div className={`w-10 h-10 md:w-12 md:h-12 ${getNodeTypeColor()} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] md:text-xs font-semibold text-accent-500 uppercase tracking-wide">
                {getNodeTypeLabel()}
              </span>
            </div>
            <div className="text-sm md:text-base font-semibold text-gray-12 mb-1 truncate">
              {node.title || `${getNodeTypeLabel()} Node`}
            </div>
            {productName && (
              <div className="text-xs md:text-sm text-gray-600 mb-1 truncate">
                {productName}
              </div>
            )}
            <div className="text-[10px] md:text-xs text-gray-500 truncate">
              {node.redirect_url}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
          <button
            onClick={onConfigure}
            className="p-2.5 md:p-2 rounded-lg hover:bg-gray-a3 transition-colors text-gray-10 hover:text-gray-12 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
            title="Configure"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onLogic}
            className="p-2.5 md:p-2 rounded-lg hover:bg-gray-a3 transition-colors text-gray-10 hover:text-accent-500 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
            title="Logic"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 md:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-10 hover:text-red-500 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </FrostedCard>
  );
}

