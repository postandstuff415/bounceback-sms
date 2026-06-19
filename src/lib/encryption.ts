import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derive a 256-bit encryption key from the ENCRYPTION_KEY environment variable.
 * 
 * In production, ENCRYPTION_KEY MUST be set to a cryptographically random
 * 64-character hex string (256 bits) or any sufficiently high-entropy secret.
 * 
 * Key derivation uses SHA-256 to normalize any input to exactly 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    console.error(
      "[ENCRYPTION] CRITICAL: ENCRYPTION_KEY environment variable is not set. " +
      "Set a 64-character hex string (256-bit key) in your .env or production secrets."
    );
    // Fallback ONLY for local development — logs a warning because this is insecure
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production. Cannot proceed without a secure key.");
    }
    console.warn("[ENCRYPTION] WARNING: Using fallback key derivation. ALWAYS set ENCRYPTION_KEY in production.");
  }
  return crypto.createHash("sha256").update(secret || "dev-only-insecure-fallback").digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * 
 * GCM provides authenticated encryption — ciphertext integrity is verified
 * on decryption, preventing tampering.
 * 
 * Returns format: hex(iv):hex(authTag):hex(ciphertext)
 * 
 * @param text - Plaintext to encrypt. Empty/null/undefined returns "".
 * @returns Encrypted string in "iv:authTag:ciphertext" hex format.
 */
export function encrypt(text: string | null | undefined): string {
  if (!text) return "";
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[ENCRYPTION] Encrypt failed:", error instanceof Error ? error.message : error);
    throw new Error("Encryption failed — data cannot be secured.");
  }
}

/**
 * Decrypt a ciphertext string that was encrypted with encrypt() (AES-256-GCM).
 * 
 * @param encryptedText - String in "iv:authTag:ciphertext" hex format.
 * @returns Decrypted plaintext string, or "" if input is empty/null.
 */
export function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return "";

  const parts = encryptedText.split(":");
  
  // New GCM format: iv:authTag:ciphertext (3 parts)
  if (parts.length === 3) {
    try {
      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const encrypted = parts[2];

      const key = getEncryptionKey();
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error(
        "[ENCRYPTION] Decrypt (GCM) failed:", 
        error instanceof Error ? error.message : error
      );
      throw new Error("Decryption failed — data may be corrupted or tampered with.");
    }
  }
  
  // Legacy CBC format: iv:ciphertext (2 parts) — backward compatibility
  if (parts.length === 2) {
    try {
      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];
      const key = getEncryptionKey();
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error(
        "[ENCRYPTION] Decrypt (legacy CBC) failed:", 
        error instanceof Error ? error.message : error
      );
      throw new Error("Decryption failed — legacy format data may be corrupted.");
    }
  }

  // If it's not an encrypted string at all, return as-is
  console.warn("[ENCRYPTION] Value doesn't match any known encrypted format — returning as-is.");
  return encryptedText;
}

/**
 * Generate a new cryptographically random 256-bit key, formatted as hex.
 * Use this output as your ENCRYPTION_KEY environment variable.
 * 
 * Usage: node -e "console.log(require('./src/lib/encryption').generateKey())"
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
