'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, CheckCircle2, X, Code } from 'lucide-react';
import { Button, Dialog } from '@whop/react/components';

import UpsellFlowBuilder from './UpsellFlowBuilder';
import EmbedCodeModal from './EmbedCodeModal';
import AlertDialog from './AlertDialog';

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
  id: string;
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
  initial_product_plan_id: string | null; // Can be null
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

export default function FlowBuilder({ companyId }: { companyId: string }) {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [plans, setPlans] = useState<WhopPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingFlow, setVerifyingFlow] = useState<string | null>(null); // Track flow being verified
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedFlowId, setEmbedFlowId] = useState<string | null>(null);
  const [embedFlowName, setEmbedFlowName] = useState<string | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Load flows list on mount
  useEffect(() => {
    const loadFlows = async () => {
      try {
        console.log('Loading flows for company:', companyId);
        const flowsResponse = await fetch(`/api/flows/${companyId}/list`);
        console.log('Flows response status:', flowsResponse.status);
        
        if (flowsResponse.ok) {
          const flowsData = await flowsResponse.json();
          console.log('Flows data received:', flowsData);
          if (flowsData.debug) {
            console.log('=== DEBUG INFO ===');
            console.log('Company ID:', flowsData.debug.companyId);
            console.log('All flows in DB:', flowsData.debug.allFlowsInDb);
            console.log('All flows:', JSON.stringify(flowsData.debug.allFlows, null, 2));
            console.log('Matching flows:', JSON.stringify(flowsData.debug.matchingFlows, null, 2));
            console.log('Query result count:', flowsData.debug.queryResultCount);
            console.log('Query result:', JSON.stringify(flowsData.debug.queryResult, null, 2));
            console.log('==================');
          }
          const flowsList = flowsData.flows || [];
          console.log('Setting flows list:', flowsList);
          console.log('Flow details:', JSON.stringify(flowsList.map((f: any) => ({ 
            id: f.id, 
            name: f.flow_name,
            initial_product_plan_id: f.initial_product_plan_id,
            initial_product_plan_id_type: typeof f.initial_product_plan_id,
            initial_product_plan_id_value: String(f.initial_product_plan_id),
            has_product: !!(f.initial_product_plan_id && String(f.initial_product_plan_id).trim() !== '')
          })), null, 2));
          setFlows(flowsList);
          
          // Don't auto-select - let user choose which flow to edit
        } else {
          const errorText = await flowsResponse.text();
          console.error('Error loading flows:', flowsResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error loading flows:', error);
      }
    };

    loadFlows();
  }, [companyId]); // Only run on mount or when companyId changes

  // Set loading to false after flows are loaded
  useEffect(() => {
    if (flows.length >= 0) {
      setLoading(false);
    }
  }, [flows]);

  // Load plans (only once)
  useEffect(() => {
    // Load available plans from Whop (non-blocking)
    fetch(`/api/whop/plans?companyId=${companyId}`)
      .then(res => res.ok ? res.json() : { plans: [] })
      .then(data => {
        // Map API response to expected format
        const mappedPlans = (data.plans || []).map((plan: any) => ({
          id: plan.id,
          title: plan.title || plan.product?.title || `Plan ${plan.id.substring(0, 8)}...`,
          initial_price: plan.initial_price || 0,
          currency: plan.currency || 'usd',
        }));
        console.log('Loaded plans:', mappedPlans.length);
        setPlans(mappedPlans);
      })
      .catch(error => {
        console.error('Error loading plans:', error);
        setPlans([]); // Set empty array so UI can still render
      });
  }, [companyId]);

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('showNewFlowModal changed to:', showNewFlowModal);
  }, [showNewFlowModal]);


  const handleCreateNewFlow = async () => {
    if (!newFlowName.trim()) {
      setAlertDialog({
        open: true,
        title: 'Warning',
        message: 'Please enter a flow name',
        type: 'warning',
      });
      return;
    }

    // Clear any stale selectedFlowId before creating new flow
    // This ensures we don't navigate to an old flow if there was a previous error
    setSelectedFlowId(null);

    try {
      console.log('Creating new flow:', { companyId, flow_name: newFlowName.trim() });
      
      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          initial_product_plan_id: null, // Allow null for new flows
          confirmation_page_url: null,
          flow_name: newFlowName.trim(),
        }),
      });

      console.log('Flow creation response status:', response.status, response.statusText);

      if (response.ok) {
        const newFlow = await response.json();
        console.log('Flow created successfully:', newFlow);
        
        // Verify we have a valid flow ID
        if (!newFlow.id) {
          console.error('Flow created but no ID returned:', newFlow);
          setAlertDialog({
            open: true,
            title: 'Error',
            message: 'Flow was created but could not be loaded. Please refresh and try again.',
            type: 'error',
          });
          return;
        }
        
        // Close modal and clear input immediately
        setShowNewFlowModal(false);
        const createdFlowName = newFlowName.trim();
        setNewFlowName('');
        
        // Set verifying state to show loading indicator
        setVerifyingFlow(newFlow.id);
        
        // Verify the flow is accessible before navigating to it
        // This prevents "Flow not found" errors due to timing/database replication delays
        const verifyAndNavigate = async () => {
          let retries = 5; // Increased retries
          let verified = false;
          
          while (retries > 0 && !verified) {
            try {
              const verifyResponse = await fetch(`/api/flows/${companyId}?flowId=${newFlow.id}`);
              
              // 200 OK means flow exists and is accessible
              if (verifyResponse.ok) {
                const flowData = await verifyResponse.json();
                if (flowData.id && flowData.id === newFlow.id && !flowData.error) {
                  verified = true;
                  console.log('Flow verified (200), navigating...');
                  
                  // Reload flows list to ensure we have the latest data
                  const flowsResponse = await fetch(`/api/flows/${companyId}/list`);
                  if (flowsResponse.ok) {
                    const flowsData = await flowsResponse.json();
                    setFlows(flowsData.flows || []);
                  }
                  
                  // Clear verifying state and navigate to the verified flow
                  setVerifyingFlow(null);
                  setSelectedFlowId(newFlow.id);
                  return;
                }
              } 
              // 403 means flow exists but subscription is blocking - still allow navigation for dashboard setup
              else if (verifyResponse.status === 403) {
                verified = true;
                console.log('Flow verified (403 - subscription block, but flow exists), navigating...');
                
                // Reload flows list to ensure we have the latest data
                const flowsResponse = await fetch(`/api/flows/${companyId}/list`);
                if (flowsResponse.ok) {
                  const flowsData = await flowsResponse.json();
                  setFlows(flowsData.flows || []);
                }
                
                // Clear verifying state and navigate - subscription banner will show in the builder
                setVerifyingFlow(null);
                setSelectedFlowId(newFlow.id);
                return;
              }
              // 404 means flow doesn't exist yet - continue retrying
              // Other errors also continue retrying
            } catch (error) {
              console.error(`Flow verification attempt failed (${retries} retries left):`, error);
            }
            
            retries--;
            if (retries > 0) {
              // Wait longer between retries (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            }
          }
          
          // If verification failed after retries, try to find the flow by name in the list
          console.warn('Flow verification failed after retries, trying to find by name in flows list');
          const flowsResponse = await fetch(`/api/flows/${companyId}/list`);
          if (flowsResponse.ok) {
            const flowsData = await flowsResponse.json();
            setFlows(flowsData.flows || []);
            const foundFlow = flowsData.flows?.find((f: FlowListItem) => 
              f.id === newFlow.id || f.flow_name === createdFlowName
            );
            if (foundFlow) {
              console.log('Found flow in list, navigating...');
              setVerifyingFlow(null);
              setSelectedFlowId(foundFlow.id);
            } else {
              // Clear verifying state and show success message
              setVerifyingFlow(null);
              setAlertDialog({
                open: true,
                title: 'Flow Created',
                message: `Flow "${createdFlowName}" was created successfully. Please select it from the list.`,
                type: 'success',
              });
            }
          } else {
            // Even the list fetch failed - clear verifying and navigate anyway
            console.warn('Could not verify flow, navigating anyway...');
            setVerifyingFlow(null);
            setSelectedFlowId(newFlow.id);
          }
        };
        
        // Start verification process
        verifyAndNavigate();
      } else {
        // Response was not OK - try to get error details
        let errorMessage = 'Failed to create flow';
        try {
          const errorData = await response.json();
          console.error('Error creating flow - Status:', response.status, 'Data:', errorData);
          errorMessage = errorData.error || errorData.message || `Server error (${response.status})`;
        } catch (jsonError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            console.error('Error creating flow - Status:', response.status, 'Text:', errorText);
            errorMessage = errorText || `Server error (${response.status})`;
          } catch (textError) {
            console.error('Error creating flow - Status:', response.status, 'Could not parse response');
            errorMessage = `Server error (${response.status})`;
          }
        }
        
        // Clear any stale selectedFlowId on error
        setSelectedFlowId(null);
        // Keep modal open and input field intact on error so user can try a different name
        setAlertDialog({
          open: true,
          title: 'Error',
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error creating flow (network/exception):', error);
      // Clear any stale selectedFlowId on error
      setSelectedFlowId(null);
      // Keep modal open and input field intact on error
      setAlertDialog({
        open: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Network error - please check your connection and try again',
        type: 'error',
      });
    }
  };


  // If a flow is selected, show the step-based builder
  if (selectedFlowId) {
    return (
      <UpsellFlowBuilder
        companyId={companyId}
        flowId={selectedFlowId}
        onBack={() => {
          setSelectedFlowId(null);
          // Reload flows list when going back
          fetch(`/api/flows/${companyId}/list`)
            .then(res => res.ok ? res.json() : { flows: [] })
            .then(data => setFlows(data.flows || []))
            .catch(err => console.error('Error reloading flows:', err));
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
          <div className="text-gray-12 text-lg font-medium">Loading flows...</div>
        </div>
      </div>
    );
  }

  // Show verifying state while checking if newly created flow is accessible
  if (verifyingFlow) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-a4 border-t-gray-12 mb-4"></div>
          <div className="text-gray-12 text-lg font-medium">Verifying flow...</div>
          <div className="text-gray-10 text-sm mt-2">Please wait while we confirm your flow is ready</div>
        </div>
      </div>
    );
  }

  // Flow selection screen
  if (!selectedFlowId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-12 mb-2">
            Checkout Flow Builder
          </h1>
          <p className="text-gray-10">Create and manage your checkout funnels</p>
        </div>

        {/* Flow Grid */}
        <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-12">Your Flows</h2>
              <Button
                color="tomato"
                variant="classic"
                size="2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowNewFlowModal(true);
                }}
              >
                New Flow
              </Button>
            </div>
            {flows.length === 0 ? (
              <div className="border border-gray-a4 rounded-xl p-12 bg-white dark:bg-gray-a2 text-center shadow-sm">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">🚀</div>
                  <h2 className="text-2xl font-bold text-gray-12 mb-3">Create Your First Funnel</h2>
                  <p className="text-gray-10 mb-6 leading-relaxed">
                    Get started by creating a checkout flow. You can track visits, purchases, and conversion rates for each funnel.
                  </p>
                  <Button
                    color="tomato"
                    variant="classic"
                    size="3"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewFlowModal(true);
                    }}
                  >
                    Create Your First Flow
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {flows.map(f => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFlowId(f.id);
                    }}
                    className={`border rounded-xl p-6 bg-white dark:bg-gray-a2 cursor-pointer transition-all duration-200 
                      shadow-sm hover:shadow-md hover:border-gray-a5
                      ${selectedFlowId === f.id ? 'border-accent-500 ring-2 ring-accent-500/20 shadow-md bg-accent-50/30 dark:bg-accent-900/10' : 'border-gray-a4'}
                    `}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-accent-500 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-gray-12" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-12 mb-1">
                            {f.flow_name || `Flow ${f.id.substring(0, 8)}`}
                          </h3>
                          <p className="text-gray-10 text-sm">
                            {(() => {
                              if (!f.initial_product_plan_id || String(f.initial_product_plan_id).trim() === '') {
                                return 'No product selected';
                              }
                              const plan = plans.find(p => p.id === f.initial_product_plan_id);
                              if (plan) {
                                return `${plan.title} - $${plan.initial_price} ${plan.currency.toUpperCase()}`;
                              }
                              return 'Product configured';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-gray-9 text-xs mb-1">Created</p>
                          <p className="text-gray-10 text-sm font-medium">
                            {new Date(f.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEmbedFlowId(f.id);
                            setEmbedFlowName(f.flow_name);
                            setShowEmbedModal(true);
                          }}
                          color="gray"
                          variant="soft"
                          size="1"
                        >
                          <Code className="w-4 h-4 mr-2" />
                          Embed
                        </Button>
                        {selectedFlowId === f.id && (
                          <CheckCircle2 className="w-6 h-6 text-accent-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* New Flow Modal - Must be here for early return case */}
        {showNewFlowModal && (
          <Dialog.Root open={showNewFlowModal} onOpenChange={(open) => !open && setShowNewFlowModal(false)}>
            <Dialog.Content 
              size="2" 
              style={{ maxWidth: '28rem' }}
            >
              <Dialog.Title className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-500" />
                Create New Flow
              </Dialog.Title>
              <Dialog.Description>Enter a name for your new checkout flow</Dialog.Description>

              <div style={{ marginTop: 'var(--space-4)' }}>
                  <label className="block text-sm font-medium text-gray-12 mb-2">
                    Flow Name
                  </label>
                  <input
                    type="text"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="e.g., Black Friday Funnel"
                    className="w-full px-3 py-2 border border-gray-a4 rounded-lg bg-white dark:bg-gray-a3 text-gray-12 placeholder:text-gray-9 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent mb-6"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        console.log('Enter key pressed');
                        handleCreateNewFlow();
                      }
                    }}
                    autoFocus
                  />
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                  <Button
                    color="gray"
                    variant="soft"
                    size="2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewFlowModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="tomato"
                    variant="classic"
                    size="2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateNewFlow();
                    }}
                  >
                    Create Flow
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        )}

        {/* Embed Code Modal */}
        {showEmbedModal && embedFlowId && (
          <EmbedCodeModal
            isOpen={showEmbedModal}
            onClose={() => {
              setShowEmbedModal(false);
              setEmbedFlowId(null);
              setEmbedFlowName(null);
            }}
            companyId={companyId}
            flowId={embedFlowId}
            flowName={embedFlowName}
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
      </div>
    );
  }

  return null;
}

