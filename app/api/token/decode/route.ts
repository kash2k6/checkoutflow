import { NextRequest, NextResponse } from 'next/server';
import { parseFlowToken } from '@/lib/token-utils';

/**
 * API endpoint to decode an encrypted token
 * Returns the original parameters (memberId, setupIntentId, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }

    // Decode token
    const params = parseFlowToken(token);

    if (!params) {
      return NextResponse.json(
        { error: 'Invalid or corrupted token' },
        { status: 400 }
      );
    }

    return NextResponse.json(params);
  } catch (error) {
    console.error('Error decoding token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decode token' },
      { status: 500 }
    );
  }
}

