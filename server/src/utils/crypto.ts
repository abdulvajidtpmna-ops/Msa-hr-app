import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte key from the configured hex key
 */
function getKey(): Buffer {
  const keyHex = config.encryptionKey;
  if (keyHex.length === 64) {
    return Buffer.from(keyHex, 'hex');
  }
  // If not 64 hex characters, hash it with SHA-256 to guarantee 32 bytes
  return crypto.createHash('sha256').update(keyHex).digest();
}

/**
 * Encrypts plain text using AES-256-GCM
 * Returns string format: iv:authTag:encryptedContent (all hex)
 */
export function encrypt(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted string
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText; // Return as-is if not formatted

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return '***DECRYPTION_ERROR***';
  }
}

/**
 * Masks sensitive numbers, e.g. "123456789012" -> "XXXX-XXXX-9012"
 */
export function maskSensitive(value: string, showLast = 4): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= showLast) return clean;
  const maskedSection = clean.slice(0, clean.length - showLast).replace(/./g, 'X');
  const lastSection = clean.slice(clean.length - showLast);
  return `${maskedSection}${lastSection}`;
}

/**
 * Hash password with bcrypt cost 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
