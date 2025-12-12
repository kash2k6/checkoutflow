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

    // Fetch regular products to get their IDs (exclude api and app products)
    const productsResponse = await fetch(
      `https://api.whop.com/api/v1/products?company_id=${companyId}&product_types=regular`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let regularProductIds: string[] = [];
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      regularProductIds = (productsData.data || []).map((product: any) => product.id);
    }

    // Filter plans to only include those from regular products
    const filteredPlans = (data.data || []).filter((plan: any) => {
      // Only include plans that have a product and the product is in the regular products list
      return plan.product && regularProductIds.includes(plan.product.id);
    });

    return NextResponse.json({
      plans: filteredPlans,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

