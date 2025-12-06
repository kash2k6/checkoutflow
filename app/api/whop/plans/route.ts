import { NextRequest, NextResponse } from 'next/server';

// Get plans for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId parameter' },
        { status: 400 }
      );
    }

    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Whop API key not configured' },
        { status: 500 }
      );
    }

    // Fetch plans from Whop API (v1)
    const response = await fetch(
      `https://api.whop.com/api/v1/plans?company_id=${companyId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Whop API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch plans' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      plans: data.data || [],
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

