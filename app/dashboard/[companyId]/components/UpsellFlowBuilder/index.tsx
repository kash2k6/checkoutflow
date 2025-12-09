'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@whop/react/components';
import SidebarNav from './SidebarNav';
import StepFlowSetup from './StepFlowSetup';
import StepInitialProduct from './StepInitialProduct';
import StepUpsellsDownsells from './StepUpsellsDownsells';
import StepConfirmation from './StepConfirmation';
import StepAdvanced from './StepAdvanced';
import NodeEditor from '../NodeEditor';
import NodeLogicEditor from '../NodeLogicEditor';
import ConfirmationCustomization from '../ConfirmationCustomization';
import CheckoutCustomization from '../CheckoutCustomization';
import AlertDialog, { ConfirmDialog } from '../AlertDialog';

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
  company_id: string;
  flow_name: string | null;
  initial_product_plan_id: string;
  confirmation_page_url: string | null;
  facebook_pixel_id?: string | null;
  checkout_theme?: 'light' | 'dark' | 'system' | null;
  checkout_customization?: {
    buttonColor?: string;
    buttonTextColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
  } | null;
  confirmation_customization?: {
    primaryColor?: string;
    headerGradientStart?: string;
    headerGradientEnd?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    textColor?: string;
    headerTitle?: string;
    headerSubtitle?: string;
    headerEmoji?: string;
    messageText?: string;
  } | null;
  nodes: FlowNode[];
}

interface FlowListItem {
  id: string;
  flow_name: string | null;
  initial_product_plan_id: string | null;
  confirmation_page_url: string | null;
  created_at: string;
  updated_at: string;
}

interface WhopPlan {
  id: string;
  title: string;
  initial_price: number;
  currency: string;
}

interface UpsellFlowBuilderProps {
  companyId: string;
  flowId: string | null;
  onBack: () => void;
}

export default function UpsellFlowBuilder({ companyId, flowId, onBack }: UpsellFlowBuilderProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [flow, setFlow] = useState<CompanyFlow | null>(null);
  const [plans, setPlans] = useState<WhopPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [nodeType, setNodeType] = useState<'upsell' | 'downsell' | 'cross_sell' | null>(null);
  const [showLogicEditor, setShowLogicEditor] = useState(false);
  const [showConfirmationCustomization, setShowConfirmationCustomization] = useState(false);
  const [showCheckoutCustomization, setShowCheckoutCustomization] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load flow data
  useEffect(() => {
    if (!flowId) {
      setLoading(false);
      setFlow(null);
      return;
    }

    const loadFlow = async () => {
      setLoading(true);
      try {
        const flowResponse = await fetch(`/api/flows/${companyId}?flowId=${flowId}`);
        if (flowResponse.ok) {
          const flowData = await flowResponse.json();
          // Check if response contains an error (even with 200 status)
          if (flowData.error) {
            console.error('Flow API returned error:', flowData.error);
            setFlow(null);
          } else if (flowData.id) {
            setFlow({
              ...flowData,
              nodes: flowData.nodes || [],
            });
          } else {
            console.error('Flow data missing ID:', flowData);
            setFlow(null);
          }
        } else if (flowResponse.status === 403) {
          // 403 means flow exists but subscription is blocking access
          // For dashboard setup, we should still allow viewing the flow
          // Try to get basic flow info from the list endpoint (which doesn't require subscription)
          console.log('Flow blocked by subscription (403), fetching basic info from list endpoint...');
          try {
            const flowsListResponse = await fetch(`/api/flows/${companyId}/list`);
            if (flowsListResponse.ok) {
              const flowsListData = await flowsListResponse.json();
              const basicFlow = flowsListData.flows?.find((f: any) => f.id === flowId);
              if (basicFlow) {
                // Create a minimal flow object with the basic info
                // The flow exists, subscription is just blocking full access
                setFlow({
                  id: basicFlow.id,
                  company_id: companyId,
                  flow_name: basicFlow.flow_name,
                  initial_product_plan_id: basicFlow.initial_product_plan_id || '',
                  confirmation_page_url: basicFlow.confirmation_page_url || null,
                  facebook_pixel_id: null,
                  checkout_theme: 'system',
                  checkout_customization: {},
                  confirmation_customization: {},
                  nodes: [], // Nodes will be empty, but flow structure is preserved
                });
                console.log('Loaded basic flow info despite subscription block');
              } else {
                console.error('Flow not found in list:', flowId);
                setFlow(null);
              }
            } else {
              console.error('Could not fetch flows list:', flowsListResponse.status);
              setFlow(null);
            }
          } catch (listError) {
            console.error('Error fetching flows list:', listError);
            setFlow(null);
          }
        } else {
          // 404 or other error - flow doesn't exist
          const errorData = await flowResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Flow load failed:', flowResponse.status, errorData);
          setFlow(null);
        }
      } catch (error) {
        console.error('Error loading flow:', error);
        setFlow(null);
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [companyId, flowId]);

  // Load plans
  useEffect(() => {
    fetch(`/api/whop/plans?companyId=${companyId}`)
      .then(res => res.ok ? res.json() : { plans: [] })
      .then(data => {
        const mappedPlans = (data.plans || []).map((plan: any) => ({
          id: plan.id,
          title: plan.title || plan.product?.title || `Plan ${plan.id.substring(0, 8)}...`,
          initial_price: plan.initial_price || 0,
          currency: plan.currency || 'usd',
        }));
        setPlans(mappedPlans);
      })
      .catch(error => {
        console.error('Error loading plans:', error);
        setPlans([]);
      });
  }, [companyId]);

  const handleUpdateFlow = (updates: Partial<CompanyFlow>) => {
    if (flow) {
      setFlow({ ...flow, ...updates });
    }
  };

  const handleSaveFlow = async () => {
    if (!flow) return;

    try {
      const response = await fetch('/api/flows', {
        method: flow.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          initial_product_plan_id: flow.initial_product_plan_id,
          confirmation_page_url: flow.confirmation_page_url,
          flow_name: flow.flow_name,
          facebook_pixel_id: flow.facebook_pixel_id || null,
          checkout_theme: flow.checkout_theme || 'system',
          checkout_customization: flow?.checkout_customization || {},
          confirmation_customization: flow?.confirmation_customization || {},
          id: flow.id || undefined,
        }),
      });

      if (response.ok) {
        const savedFlow = await response.json();
        setFlow(savedFlow);
        setAlertDialog({
          open: true,
          title: 'Success',
          message: 'Flow saved successfully!',
          type: 'success',
        });
      } else {
        const error = await response.json();
        setAlertDialog({
          open: true,
          title: 'Error',
          message: error.error || 'Unknown error',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Error saving flow',
        type: 'error',
      });
    }
  };

  const handleAddNode = (type: 'upsell' | 'downsell' | 'cross_sell') => {
    if (!flow || !flow.id) {
      setAlertDialog({
        open: true,
        title: 'Warning',
        message: 'Please save the flow first before adding nodes.',
        type: 'warning',
      });
      return;
    }
    setNodeType(type);
    setEditingNode(null);
    setShowNodeEditor(true);
  };

  const handleEditNode = (node: FlowNode) => {
    setEditingNode(node);
    setNodeType(node.node_type);
    setShowNodeEditor(true);
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!flow?.id) return;
    
    setConfirmDialog({
      open: true,
      title: 'Delete Node',
      message: 'Are you sure you want to delete this node? This action cannot be undone.',
      onConfirm: async () => {
        await performDeleteNode(nodeId);
      },
    });
  };

  const performDeleteNode = async (nodeId: string) => {
    if (!flow?.id) return;

    try {
      const response = await fetch(`/api/flows/${companyId}/nodes/${nodeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_id: flow.id }),
      });

      if (response.ok) {
        // Reload flow
        const flowResponse = await fetch(`/api/flows/${companyId}?flowId=${flow.id}`);
        if (flowResponse.ok) {
          const flowData = await flowResponse.json();
          setFlow({
            ...flowData,
            nodes: flowData.nodes || [],
          });
        }
      } else {
        const errorData = await response.json();
        setAlertDialog({
          open: true,
          title: 'Error',
          message: errorData.error || 'Unknown error',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Error deleting node',
        type: 'error',
      });
    }
  };

  const handleLogicNode = (node: FlowNode) => {
    setEditingNode(node);
    setShowLogicEditor(true);
  };

  const handleNodeSaved = () => {
    setShowNodeEditor(false);
    setEditingNode(null);
    setNodeType(null);
    // Reload flow
    if (flow?.id) {
      fetch(`/api/flows/${companyId}?flowId=${flow.id}`)
        .then(res => res.json())
        .then(data => {
          setFlow({
            ...data,
            nodes: data.nodes || [],
          });
        })
        .catch(err => console.error('Error reloading flow:', err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
          <div className="text-gray-12 text-lg font-medium">Loading flow configuration...</div>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-12 text-lg font-medium mb-2">Flow not found</div>
        <Button onClick={onBack} color="gray" variant="classic" size="2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Flows
        </Button>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <StepFlowSetup
            flow={flow}
            onUpdate={handleUpdateFlow}
            onSave={handleSaveFlow}
            companyId={companyId}
          />
        );
      case 2:
        return (
          <StepInitialProduct
            flow={flow}
            onUpdate={handleUpdateFlow}
            onSave={handleSaveFlow}
            companyId={companyId}
          />
        );
      case 3:
        return (
          <StepUpsellsDownsells
            flow={flow}
            plans={plans}
            onAddNode={handleAddNode}
            onEditNode={handleEditNode}
            onDeleteNode={handleDeleteNode}
            onLogicNode={handleLogicNode}
            onSave={handleSaveFlow}
          />
        );
      case 4:
        return (
          <StepConfirmation
            flow={flow}
            onUpdate={handleUpdateFlow}
            onSave={handleSaveFlow}
            onCustomize={() => setShowConfirmationCustomization(true)}
          />
        );
      case 5:
        return (
          <StepAdvanced
            flow={flow}
            onUpdate={handleUpdateFlow}
            onSave={handleSaveFlow}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-a1 dark:via-gray-a2 dark:to-gray-a1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onBack}
            color="gray"
            variant="classic"
            size="2"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Flows
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <SidebarNav activeStep={activeStep} onStepChange={setActiveStep} />

          {/* Right Content Panel */}
          <div className="flex-1 min-w-0">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Node Editor Modal */}
      {showNodeEditor && nodeType && flow?.id && (
        <NodeEditor
          companyId={companyId}
          flowId={flow.id}
          node={editingNode}
          nodeType={nodeType}
          plans={plans}
          onClose={() => {
            setShowNodeEditor(false);
            setEditingNode(null);
            setNodeType(null);
          }}
          onSave={handleNodeSaved}
        />
      )}

      {/* Logic Editor Modal */}
      {showLogicEditor && editingNode && flow?.id && (
        <NodeLogicEditor
          nodeId={editingNode.id}
          flowId={flow.id}
          companyId={companyId}
          availableNodes={flow.nodes || []}
          confirmationPageUrl={flow.confirmation_page_url}
          onClose={() => {
            setShowLogicEditor(false);
            setEditingNode(null);
          }}
          onSave={handleNodeSaved}
        />
      )}

      {/* Confirmation Customization Modal */}
      {showConfirmationCustomization && flow && flow.id && (
        <ConfirmationCustomization
          flow={flow as any}
          onClose={() => setShowConfirmationCustomization(false)}
          onSave={(customization) => {
            setFlow({ ...flow, confirmation_customization: customization } as any);
            setShowConfirmationCustomization(false);
          }}
        />
      )}

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        variant="danger"
      />

      {/* Checkout Customization Modal */}
      {showCheckoutCustomization && flow && flow.id && (
        <CheckoutCustomization
          flow={flow as any}
          onClose={() => setShowCheckoutCustomization(false)}
          onSave={async (customization) => {
            const updatedFlow = {
              ...flow,
              checkout_theme: customization.checkout_theme,
              checkout_customization: customization.checkout_customization
            } as any;
            setFlow(updatedFlow);
            
            try {
              const savePayload = {
                id: flow.id,
                company_id: companyId,
                initial_product_plan_id: flow.initial_product_plan_id,
                confirmation_page_url: flow.confirmation_page_url,
                flow_name: flow.flow_name,
                facebook_pixel_id: flow.facebook_pixel_id || null,
                checkout_theme: customization.checkout_theme,
                checkout_customization: customization.checkout_customization,
                confirmation_customization: flow.confirmation_customization || {},
              };
              
              const response = await fetch('/api/flows', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(savePayload),
              });

              if (response.ok) {
                const savedFlow = await response.json();
                setFlow(savedFlow);
                alert('Checkout customization saved successfully!');
              } else {
                const error = await response.json();
                alert(`Error saving customization: ${error.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('Error saving checkout customization:', error);
              alert('Error saving checkout customization');
            }
            
            setShowCheckoutCustomization(false);
          }}
        />
      )}

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        variant="danger"
      />
    </div>
  );
}

