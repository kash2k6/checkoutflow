import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId');

    if (!productId || (productId !== 'youth' && productId !== 'roman')) {
      return NextResponse.json(
        { error: 'Invalid productId. Must be "youth" or "roman"' },
        { status: 400 }
      );
    }

    const productDir = join(process.cwd(), 'public', 'products', productId);
    
    try {
      const files = await readdir(productDir);
      
      // Filter for image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const imageFiles = files
        .filter((file) => {
          const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
          return imageExtensions.includes(ext);
        })
        .map((file) => `/products/${productId}/${file}`)
        .sort(); // Sort alphabetically

      return NextResponse.json({ images: imageFiles });
    } catch (error) {
      // Directory doesn't exist or can't be read
      return NextResponse.json({ images: [] });
    }
  } catch (error) {
    console.error('Error listing product images:', error);
    return NextResponse.json(
      { error: 'Failed to list images' },
      { status: 500 }
    );
  }
}

