import { NextRequest, NextResponse } from 'next/server';

// Get products for a company, filtered to only show regular products
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

    // Fetch products from Whop API (v1), filtering for only regular products
    const response = await fetch(
      `https://api.whop.com/api/v1/products?company_id=${companyId}&product_types=regular`,
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
        { error: error.message || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      products: data.data || [],
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

