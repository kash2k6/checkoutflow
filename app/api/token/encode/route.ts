import { NextRequest, NextResponse } from 'next/server';
import { createFlowToken } from '@/lib/token-utils';

/**
 * API endpoint to create an encrypted token from sensitive parameters
 * Used to hide memberId, setupIntentId, etc. from URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, setupIntentId, companyId, flowId, sessionId, nodeId } = body;

    // Create encrypted token
    const token = createFlowToken({
      memberId: memberId || null,
      setupIntentId: setupIntentId || null,
      companyId: companyId || null,
      flowId: flowId || null,
      sessionId: sessionId || null,
      nodeId: nodeId || null,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create token' },
      { status: 500 }
    );
  }
}

