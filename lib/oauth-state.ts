import crypto from "crypto";

/**
 * OAuth State Management
 * 
 * Provides stateless OAuth by encrypting user identity into the state parameter.
 * This eliminates dependency on session cookies, ensuring mobile browser compatibility.
 */

const ALGORITHM = "aes-256-gcm";
const STATE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

interface StatePayload {
  userId: string;
  timestamp: number;
  nonce: string;
}

/**
 * Derives a 32-byte encryption key from NEXTAUTH_SECRET
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not defined");
  }
  // Use SHA-256 to derive a consistent 32-byte key
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts OAuth state containing user identity
 * 
 * @param userId - The user's ID to embed in the state
 * @returns Encrypted state string (base64url encoded)
 */
export function encryptState(userId: string): string {
  const payload: StatePayload = {
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv + authTag + encrypted (all base64url encoded as one string)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64url");
}

/**
 * Decrypts and validates OAuth state
 * 
 * @param state - The encrypted state string from OAuth callback
 * @returns Decrypted payload containing userId
 * @throws Error if state is invalid, expired, or tampered
 */
export function decryptState(state: string): StatePayload {
  try {
    const combined = Buffer.from(state, "base64url");

    // Extract components
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const payload: StatePayload = JSON.parse(decrypted.toString("utf8"));

    // Validate timestamp expiry
    const age = Date.now() - payload.timestamp;
    if (age > STATE_EXPIRY_MS) {
      throw new Error(`State expired (age: ${Math.floor(age / 1000)}s)`);
    }

    if (age < 0) {
      throw new Error("State timestamp is in the future");
    }

    // Validate payload structure
    if (!payload.userId || !payload.timestamp || !payload.nonce) {
      throw new Error("Invalid state payload structure");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`State validation failed: ${error.message}`);
    }
    throw new Error("State validation failed: Unknown error");
  }
}
