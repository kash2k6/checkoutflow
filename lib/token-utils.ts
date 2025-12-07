import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Token utilities for encrypting/decrypting sensitive URL parameters
 * Uses AES-256-GCM encryption for security
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16; // For GCM, this is always 16

/**
 * Get encryption key from environment variable
 * Falls back to a default for development (should be set in production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_SECRET_KEY || 'default-dev-key-change-in-production-min-32-chars';
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_SECRET_KEY must be at least 32 characters long');
  }
  
  // Use SHA-256 to ensure key is exactly 32 bytes
  return createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data to create a secure token
 */
export function encryptToken(data: Record<string, string | null | undefined>): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag for GCM
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    const token = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    
    // Base64 encode for URL safety
    return Buffer.from(token).toString('base64url');
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token to get the original data
 */
export function decryptToken(token: string): Record<string, string | null | undefined> | null {
  try {
    const key = getEncryptionKey();
    
    // Base64 decode
    const tokenBuffer = Buffer.from(token, 'base64url');
    const tokenString = tokenBuffer.toString('utf8');
    
    // Split into IV, auth tag, and encrypted data
    const parts = tokenString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
}

/**
 * Create a secure token from checkout/flow parameters
 */
export function createFlowToken(params: {
  memberId?: string | null;
  setupIntentId?: string | null;
  companyId?: string | null;
  flowId?: string | null;
  sessionId?: string | null;
  nodeId?: string | null;
}): string {
  return encryptToken({
    memberId: params.memberId || null,
    setupIntentId: params.setupIntentId || null,
    companyId: params.companyId || null,
    flowId: params.flowId || null,
    sessionId: params.sessionId || null,
    nodeId: params.nodeId || null,
  });
}

/**
 * Parse a flow token to get the original parameters
 */
export function parseFlowToken(token: string): {
  memberId?: string | null;
  setupIntentId?: string | null;
  companyId?: string | null;
  flowId?: string | null;
  sessionId?: string | null;
  nodeId?: string | null;
} | null {
  const data = decryptToken(token);
  if (!data) return null;
  
  return {
    memberId: data.memberId || null,
    setupIntentId: data.setupIntentId || null,
    companyId: data.companyId || null,
    flowId: data.flowId || null,
    sessionId: data.sessionId || null,
    nodeId: data.nodeId || null,
  };
}

