import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Store setup intent and member data in Supabase for reliable retrieval
 * across serverless instances
 */

/**
 * Webhook handler for Whop events
 * Follows Whop's recommended approach:
 * - Store member ID from payment.succeeded (after checkout completes)
 * - Payment methods are stored by Whop and can be retrieved via API
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Verify webhook signature using WHOP_WEBHOOK_SECRET
    // For now, we'll trust the webhook (in production, always verify!)
    
    const body = await request.json();
    const { type, data } = body;
    
    // Store full body for metadata access (metadata is at body.data.metadata, not data.metadata)
    const fullBody = body;

    // Handle setup intent succeeded - payment method is now saved by Whop
    // According to Whop docs, we can retrieve payment methods via API using member ID
    if (type === 'setup_intent.succeeded') {
      const setupIntent = data;
      const paymentMethodId = setupIntent.payment_method?.id;
      const memberId = setupIntent.member?.id;
      const userEmail = setupIntent.member?.user?.email || setupIntent.member?.email;
      
      // Metadata is at the top level of the webhook data, not in checkout_configuration
      // The webhook structure is: { type, data: { metadata: {...}, member: {...}, ... } }
      const metadataEmail = fullBody.data?.metadata?.userEmail;
      const metadataPlanId = fullBody.data?.metadata?.planId;
      
      // Also check checkout_configuration metadata as fallback
      const checkoutConfig = setupIntent.checkout_configuration;
      const checkoutConfigMetadataEmail = checkoutConfig?.metadata?.userEmail;
      const checkoutConfigMetadataPlanId = checkoutConfig?.metadata?.planId;

      console.log('Setup intent succeeded:', {
        setupIntentId: setupIntent.id,
        paymentMethodId,
        memberId,
        userEmail: userEmail || metadataEmail || checkoutConfigMetadataEmail || 'not found',
        metadataEmail: metadataEmail || checkoutConfigMetadataEmail,
        planId: metadataPlanId || checkoutConfigMetadataPlanId || 'not in metadata',
        checkoutConfigId: checkoutConfig?.id,
        fullMetadata: JSON.stringify(fullBody.data?.metadata || {}, null, 2),
      });

      // Use email from member, metadata, or checkout config metadata
      const emailToUse = userEmail || metadataEmail || checkoutConfigMetadataEmail;
      const planIdToUse = metadataPlanId || checkoutConfigMetadataPlanId;

      // Store setup intent ID - we can retrieve member ID and payment method from it when needed
      const setupIntentId = setupIntent.id;
      
      if (setupIntentId && emailToUse && memberId) {
        console.log('Setup intent ID to store in Supabase:', { email: emailToUse, setupIntentId, memberId, planId: planIdToUse });
        
        // Store in Supabase (upsert by email) if configured
        if (isSupabaseConfigured() && supabase) {
          try {
            const { error } = await supabase
              .from('whop_member_data')
              .upsert({
                email: emailToUse.toLowerCase(),
                member_id: memberId,
                setup_intent_id: setupIntentId,
                payment_method_id: paymentMethodId || null,
                initial_plan_id: planIdToUse || null,
                checkout_config_id: checkoutConfig?.id || null,
              }, {
                onConflict: 'email',
              });

            if (error) {
              console.error('Error storing in Supabase:', error);
            } else {
              console.log('Successfully stored in Supabase');
            }
          } catch (error) {
            console.error('Exception storing in Supabase:', error);
          }
        } else {
          console.log('Supabase not configured, skipping storage');
        }
      } else if (setupIntentId && memberId) {
        console.log('Setup intent succeeded with setup intent ID but no email:', { setupIntentId, memberId, planId: planIdToUse });
      }
    }

    // Handle payment succeeded - we have member ID, try to get email from Whop API
    if (type === 'payment.succeeded') {
      const payment = data;
      const memberId = payment.member?.id;
      const userEmail = payment.member?.user?.email || payment.member?.email;
      
      // Try to get email from checkout configuration metadata
      const checkoutConfig = payment.checkout_configuration;
      const metadataEmail = checkoutConfig?.metadata?.userEmail;

      console.log('Payment succeeded:', {
        paymentId: payment.id,
        amount: payment.total,
        currency: payment.currency,
        memberId,
        userEmail: userEmail || metadataEmail || 'not provided',
        metadataEmail,
        checkoutConfigId: checkoutConfig?.id,
      });

      // If we have member ID, try to get email from Whop API
      if (memberId && !userEmail && !metadataEmail && process.env.WHOP_API_KEY) {
        try {
          const memberResponse = await fetch(
            `https://api.whop.com/api/v2/members/${memberId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (memberResponse.ok) {
            const memberData = await memberResponse.json();
            const apiEmail = memberData.user?.email || memberData.email;
            if (apiEmail) {
              console.log('Retrieved email from Whop API for member:', { memberId, email: apiEmail });
              // Note: We don't store here because we need setup intent ID, not just member ID
            }
          }
        } catch (error) {
          console.error('Error fetching member from Whop API:', error);
        }
      }

      // Use email from member, metadata, or API
      const emailToUse = userEmail || metadataEmail;

      // Track purchase in analytics
      if (memberId && isSupabaseConfigured() && supabase) {
        try {
          // Get flowId and companyId from metadata
          const metadataFlowId = checkoutConfig?.metadata?.flowId;
          const metadataCompanyId = checkoutConfig?.metadata?.companyId;
          const metadataPlanId = checkoutConfig?.metadata?.planId;
          const metadataNodeId = checkoutConfig?.metadata?.nodeId;
          const metadataPurchaseType = checkoutConfig?.metadata?.purchaseType || 'initial';
          
          // Determine purchase type based on metadata or plan context
          let purchaseType: 'initial' | 'upsell' | 'downsell' | 'cross_sell' = 'initial';
          if (metadataPurchaseType && ['initial', 'upsell', 'downsell', 'cross_sell'].includes(metadataPurchaseType)) {
            purchaseType = metadataPurchaseType as any;
          }

          if (metadataFlowId && metadataCompanyId && metadataPlanId) {
            // Get plan amount from payment or metadata
            const amount = payment.total || payment.amount || 0;
            const currency = payment.currency || 'usd';

            // Track purchase
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/track/purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                flow_id: metadataFlowId,
                company_id: metadataCompanyId,
                member_id: memberId,
                plan_id: metadataPlanId,
                purchase_type: purchaseType,
                node_id: metadataNodeId || null,
                amount: amount / 100, // Convert from cents to dollars
                currency,
                session_id: checkoutConfig?.metadata?.sessionId || null,
              }),
            }).catch(err => console.error('Error tracking purchase:', err));
          }
        } catch (error) {
          console.error('Error in purchase tracking:', error);
        }
      }

      // For payment.succeeded, we don't store here because we need setup intent ID
      // The setup intent should have been stored when setup_intent.succeeded fired
      // If we need member ID for payment.succeeded, we can retrieve it from the payment
    }

    // Handle payment failed
    if (type === 'payment.failed') {
      console.log('Payment failed:', {
        paymentId: data.id,
        failureMessage: data.failure_message,
        memberId: data.member?.id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve setup intent ID (and member ID) by email or checkout config
 * This is called from the client to get setup intent ID for charging
 * 
 * Since in-memory storage doesn't persist across serverless invocations,
 * we try to get setup intent from Whop API using checkout config ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const email = searchParams.get('email');
    const setupIntentId = searchParams.get('setupIntentId'); // Direct setup intent ID lookup
    const checkoutConfigId = searchParams.get('checkoutConfigId'); // Lookup by checkout config (can be used with email)

    // If setupIntentId is provided directly, retrieve it from Whop API
    if (setupIntentId && process.env.WHOP_API_KEY) {
      try {
        const setupIntentResponse = await fetch(
          `https://api.whop.com/api/v2/setup_intents/${setupIntentId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (setupIntentResponse.ok) {
          const setupIntent = await setupIntentResponse.json();
          return NextResponse.json({
            setupIntentId,
            memberId: setupIntent.member?.id,
            email: setupIntent.member?.user?.email || setupIntent.member?.email || email || 'unknown',
            paymentMethodId: setupIntent.payment_method?.id,
            source: 'direct_api',
          });
        }
      } catch (error) {
        console.error('Error retrieving setup intent:', error);
      }
    }

    // Try to get by checkout config ID (if provided)
    if (checkoutConfigId) {
      // First, try Supabase lookup by checkout_config_id (fastest and most reliable)
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('whop_member_data')
            .select('*')
            .eq('checkout_config_id', checkoutConfigId)
            .single();

          if (!error && data) {
            return NextResponse.json({
              setupIntentId: data.setup_intent_id,
              memberId: data.member_id,
              email: data.email,
              paymentMethodId: data.payment_method_id,
              initialPlanId: data.initial_plan_id,
              source: 'supabase_by_checkout_config',
            });
          }
        } catch (error) {
          console.error('Error querying Supabase by checkout_config_id:', error);
        }
      }

      // Fallback to Whop API lookup if Supabase doesn't have it yet
      if (process.env.WHOP_API_KEY) {
        try {
          // First, try to get checkout config to see if it has setup_intent_id
        const checkoutConfigResponse = await fetch(
          `https://api.whop.com/api/v1/checkout_configurations/${checkoutConfigId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (checkoutConfigResponse.ok) {
          const checkoutConfig = await checkoutConfigResponse.json();
          
          if (checkoutConfig.setup_intent_id) {
            const setupIntentResponse = await fetch(
              `https://api.whop.com/api/v2/setup_intents/${checkoutConfig.setup_intent_id}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (setupIntentResponse.ok) {
              const setupIntent = await setupIntentResponse.json();
              return NextResponse.json({
                setupIntentId: setupIntent.id,
                memberId: setupIntent.member?.id,
                email: setupIntent.member?.user?.email || setupIntent.member?.email || email || 'unknown',
                paymentMethodId: setupIntent.payment_method?.id,
                source: 'checkout_config_api',
              });
            }
          } else {
            // Checkout config exists but no setup_intent_id yet - list setup intents for this checkout config
            const companyId = process.env.WHOP_COMPANY_ID;
            const url = companyId 
              ? `https://api.whop.com/api/v2/setup_intents?company_id=${companyId}&limit=10`
              : 'https://api.whop.com/api/v2/setup_intents?limit=10';
            
            const setupIntentsResponse = await fetch(
              url,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (setupIntentsResponse.ok) {
              const setupIntents = await setupIntentsResponse.json();
              const setupIntent = setupIntents.data?.find(
                (si: any) => si.checkout_configuration?.id === checkoutConfigId
              );
              
              if (setupIntent) {
                const memberId = setupIntent.member?.id;
                const setupIntentId = setupIntent.id;
                const userEmail = setupIntent.member?.user?.email || setupIntent.member?.email || email;
                
                // Store in Supabase for future lookups if configured
                if (memberId && setupIntentId && userEmail && isSupabaseConfigured() && supabase) {
                  try {
                    await supabase
                      .from('whop_member_data')
                      .upsert({
                        email: userEmail.toLowerCase(),
                        member_id: memberId,
                        setup_intent_id: setupIntentId,
                        payment_method_id: setupIntent.payment_method?.id || null,
                        checkout_config_id: checkoutConfigId || null,
                      }, {
                        onConflict: 'email',
                      });
                  } catch (error) {
                    console.error('Error storing in Supabase:', error);
                  }
                }
                
                return NextResponse.json({
                  setupIntentId,
                  memberId,
                  email: userEmail || 'unknown',
                  paymentMethodId: setupIntent.payment_method?.id,
                  source: 'checkout_config_list_api',
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error retrieving from checkout config:', error);
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Missing email, setupIntentId, or checkoutConfigId parameter' },
        { status: 400 }
      );
    }

    // First, try Supabase (persistent storage) if configured
    if (email && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('whop_member_data')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (!error && data) {
          return NextResponse.json({
            setupIntentId: data.setup_intent_id,
            memberId: data.member_id,
            email: data.email,
            paymentMethodId: data.payment_method_id,
            initialPlanId: data.initial_plan_id,
            source: 'supabase',
          });
        }
      } catch (error) {
        console.error('Error querying Supabase:', error);
      }
    }

    // If not in memory, try to get from Whop API by listing recent payments
    // and finding one with matching email
    if (process.env.WHOP_API_KEY) {
      try {
        // List recent payments and find one with matching member email
        const paymentsResponse = await fetch(
          'https://api.whop.com/api/v2/payments?limit=20',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          // Find payment with matching email
          for (const payment of payments.data || []) {
            const paymentMemberEmail = payment.member?.user?.email || payment.member?.email;
            if (paymentMemberEmail && paymentMemberEmail.toLowerCase() === email.toLowerCase()) {
              const foundMemberId = payment.member?.id;
              // Try to find setup intent for this member
              if (foundMemberId && process.env.WHOP_API_KEY) {
                try {
                  const setupIntentsResponse = await fetch(
                    `https://api.whop.com/api/v2/setup_intents?member_id=${foundMemberId}&limit=1`,
                    {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                  
                  if (setupIntentsResponse.ok) {
                    const setupIntents = await setupIntentsResponse.json();
                    const setupIntent = setupIntents.data?.[0];
                    if (setupIntent) {
                      const setupIntentId = setupIntent.id;
                      
                      // Store in Supabase for future lookups if configured
                      if (isSupabaseConfigured() && supabase) {
                        try {
                          await supabase
                            .from('whop_member_data')
                            .upsert({
                              email: email.toLowerCase(),
                              member_id: foundMemberId,
                              setup_intent_id: setupIntentId,
                              payment_method_id: setupIntent.payment_method?.id || null,
                            }, {
                              onConflict: 'email',
                            });
                        } catch (error) {
                          console.error('Error storing in Supabase:', error);
                        }
                      }
                      
                      return NextResponse.json({
                        setupIntentId,
                        memberId: foundMemberId,
                        email: email,
                        paymentMethodId: setupIntent.payment_method?.id,
                        source: 'api_setup_intents',
                      });
                    }
                  }
                } catch (error) {
                  console.error('Error fetching setup intents:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from Whop API:', error);
      }
    }

    return NextResponse.json(
      { 
        error: 'Setup intent not found. The payment setup may not have completed yet, or the setup intent ID was not stored.',
        hint: 'Setup intent ID should be stored when setup_intent.succeeded webhook fires. Check webhook logs.'
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Retrieve member data error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve member data' },
      { status: 500 }
    );
  }
}

// Route segment config for App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

