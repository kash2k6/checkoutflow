import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const pathname = request.nextUrl.pathname;

  // Allow cross-origin embedding for checkout, upsell, and confirmation pages
  if (
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/upsell') ||
    pathname.startsWith('/confirmation') ||
    pathname === '/embed.js'
  ) {
    // Remove X-Frame-Options header to allow embedding
    response.headers.delete('X-Frame-Options');
    // Set Content-Security-Policy to allow all origins
    response.headers.set('Content-Security-Policy', 'frame-ancestors *;');
    // Prevent caching for confirmation page to avoid stale content
    if (pathname.startsWith('/confirmation')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/upsell/:path*',
    '/confirmation/:path*',
    '/embed.js',
  ],
};

