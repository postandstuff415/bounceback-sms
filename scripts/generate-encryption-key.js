#!/usr/bin/env node

/**
 * Encryption Key Management Utility for BounceBack SMS
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js          # Generate a new key
 *   node scripts/generate-encryption-key.js --qr      # Show key with QR-friendly format
 *   node scripts/generate-encryption-key.js --env     # Output as .env-compatible line
 * 
 * Security Best Practices:
 * 1. Generate one key per environment (dev/staging/prod)
 * 2. Store the key in a secrets manager (AWS Secrets Manager, Vault, etc.)
 * 3. Never commit the actual key to version control
 * 4. For key rotation: re-encrypt existing data with the new key
 *    during a scheduled maintenance window
 */

const crypto = require("crypto");

function generateKey() {
  return crypto.randomBytes(32).toString("hex");
}

const args = process.argv.slice(2);

if (args.includes("--env")) {
  const key = generateKey();
  console.log(`# Generate a new encryption key for production deployment`);
  console.log(`ENCRYPTION_KEY="${key}"`);
  console.log(`# Save this key to your secrets manager. You cannot recover data without it.`);
} else if (args.includes("--qr")) {
  const key = generateKey();
  console.log(key);
  console.log(`\nKey length: ${key.length} hex chars (256 bits)`);
  console.log(`Security level: AES-256-GCM (authenticated encryption)`);
} else {
  const key = generateKey();
  console.log(`🔐 BounceBack SMS - Encryption Key Generator`);
  console.log(`═`.repeat(50));
  console.log(`\nGenerated Key: ${key}`);
  console.log(`Key Length:    ${key.length} hex characters (256 bits)`);
  console.log(`Algorithm:     AES-256-GCM`);
  console.log(`\n⚠️  Store this key securely!`);
  console.log(`   Set it as the ENCRYPTION_KEY environment variable.`);
  console.log(`   Without this key, encrypted data CANNOT be recovered.`);
  console.log(`\n   Add to .env:  ENCRYPTION_KEY="${key}"`);
  console.log(`═`.repeat(50));
}
