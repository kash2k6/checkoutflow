import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import DashboardWithSubscription from './components/DashboardWithSubscription';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  
  try {
    // Use dontThrow in case token is missing (dev mode)
    const result = await whopSdk.verifyUserToken(await headers(), { dontThrow: true });
    
    if (!result || !result.userId) {
      // In dev mode, allow access without strict auth (for testing)
      // In production, this should be blocked
      if (process.env.NODE_ENV === 'production') {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-12 mb-4">Authentication Required</h1>
              <p className="text-gray-10">Please access this page through the Whop dashboard.</p>
            </div>
          </div>
        );
      }
      // Dev mode: allow access but show warning
      return (
        <div className="min-h-screen">
          <div className="bg-yellow-500/20 border-b border-yellow-500/40 p-4 text-center">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              ⚠️ Development Mode: Authentication bypassed. Access through Whop dashboard in production.
            </p>
          </div>
          <DashboardWithSubscription companyId={companyId} />
        </div>
      );
    }

    const { userId } = result;

    // Check if user has admin access to this company
    const access = await whopSdk.users.checkAccess(
      companyId,
      { id: userId }
    );

    if (access.access_level !== 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-12 mb-4">Access Denied</h1>
            <p className="text-gray-10">Admin access required to configure checkout flows.</p>
          </div>
        </div>
      );
    }

    // Always allow dashboard access - subscription check and banner handled client-side
    return (
      <div className="min-h-screen">
        <DashboardWithSubscription companyId={companyId} />
      </div>
    );
  } catch (error) {
    // Fallback error handling
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-gray-12 mb-4">Authentication Error</h1>
          <p className="text-gray-10 mb-4">
            {error instanceof Error ? error.message : 'Failed to authenticate user'}
          </p>
          <p className="text-gray-9 text-sm">
            Make sure you're accessing this through the Whop dashboard with the dev proxy enabled.
          </p>
        </div>
      </div>
    );
  }
}
