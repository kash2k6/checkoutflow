import { NextRequest, NextResponse } from 'next/server';

// Generate embed code for a company's checkout flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = request.nextUrl;
    const pageType = searchParams.get('type') || 'checkout'; // checkout, upsell, downsell, cross_sell, confirmation
    const flowId = searchParams.get('flowId'); // Optional flow ID
    const nodeId = searchParams.get('nodeId'); // Optional node ID for specific node embeds

    // Get base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Generate embed script based on page type
    let embedScript = '';
    
    if (pageType === 'checkout') {
      embedScript = `<script async defer src="${baseUrl}/embed.js"></script>
<div data-xperience-checkout data-company-id="${companyId}"${flowId ? ` data-flow-id="${flowId}"` : ''} style="width: 100%; height: 100%; min-width: 320px;"></div>`.trim();
    } else if (pageType === 'upsell' || pageType === 'downsell' || pageType === 'cross_sell') {
      // For upsell/downsell/cross-sell, include nodeId if provided
      embedScript = `<script async defer src="${baseUrl}/embed.js"></script>
<div data-xperience-upsell data-company-id="${companyId}"${flowId ? ` data-flow-id="${flowId}"` : ''}${nodeId ? ` data-node-id="${nodeId}"` : ''} style="width: 100%; height: 100%; min-width: 320px;"></div>
<!-- Note: nodeId specifies which ${pageType} to display. If omitted, the first ${pageType} in the flow will be shown. -->`.trim();
    } else if (pageType === 'confirmation') {
      embedScript = `<script async defer src="${baseUrl}/embed.js"></script>
<div data-xperience-confirmation data-company-id="${companyId}"${flowId ? ` data-flow-id="${flowId}"` : ''} style="width: 100%; height: 100%; min-width: 320px;"></div>`.trim();
    }

    return NextResponse.json({
      embedCode: embedScript,
      instructions: `Copy and paste this code into your ${pageType} page where you want the checkout flow to appear.`,
    });
  } catch (error) {
    console.error('Error generating embed code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate embed code' },
      { status: 500 }
    );
  }
}

