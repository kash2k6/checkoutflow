/**
 * Client-side utilities for working with secure tokens
 * These functions call the server API to encode/decode tokens
 */

/**
 * Create a secure token from sensitive parameters
 * Calls the server API to encrypt the data
 */
export async function createSecureToken(params: {
  memberId?: string | null;
  setupIntentId?: string | null;
  companyId?: string | null;
  flowId?: string | null;
  sessionId?: string | null;
  nodeId?: string | null;
}): Promise<string | null> {
  try {
    const response = await fetch('/api/token/encode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to create token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('Error creating token:', error);
    return null;
  }
}

/**
 * Decode a secure token to get the original parameters
 * Calls the server API to decrypt the token
 */
export async function decodeSecureToken(token: string): Promise<{
  memberId?: string | null;
  setupIntentId?: string | null;
  companyId?: string | null;
  flowId?: string | null;
  sessionId?: string | null;
  nodeId?: string | null;
} | null> {
  try {
    const response = await fetch(`/api/token/decode?token=${encodeURIComponent(token)}`);

    if (!response.ok) {
      console.error('Failed to decode token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

