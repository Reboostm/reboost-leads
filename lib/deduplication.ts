/**
 * Lead Deduplication Logic
 * Fingerprinting strategy to identify and prevent duplicate leads
 */

import crypto from 'crypto';

/**
 * Generate a fingerprint for deduplication
 * Combines: normalized business name + city + state + phone
 * This identifies the same business across multiple sources
 */
export function generateFingerprint(
  businessName: string,
  city: string,
  state: string,
  phone?: string,
  email?: string
): string {
  // Normalize inputs
  const normalizedName = businessName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  const normalizedCity = city
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedState = state.toUpperCase().trim();

  // Primary identifier: name + location
  const primaryKey = `${normalizedName}|${normalizedCity}|${normalizedState}`;

  // Secondary identifiers for additional matching
  const secondaryKey = phone
    ? `${phone.replace(/\D/g, '')}` // Remove all non-digits
    : email
    ? email.toLowerCase().trim()
    : '';

  // Combine primary + secondary if available
  const combinedKey = secondaryKey ? `${primaryKey}|${secondaryKey}` : primaryKey;

  // Create hash
  const hash = crypto.createHash('sha256').update(combinedKey).digest('hex');

  return hash;
}

/**
 * Check if a lead already exists by fingerprint
 * Also supports email and phone matching as secondary checks
 */
export interface DeduplicationResult {
  isDuplicate: boolean;
  matchType?: 'fingerprint' | 'email' | 'phone' | 'combined'; // How it matched
  existingLeadId?: string; // If duplicate, the ID of existing lead
}

/**
 * Calculate similarity between two strings (0-1, where 1 is identical)
 * Used for fuzzy matching of business names
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance for fuzzy matching
 */
function getEditDistance(str1: string, str2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }

  return costs[str2.length];
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // Remove all non-digits
}

/**
 * Normalize email for comparison
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Extract domain from email
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts[1]?.toLowerCase() || '';
}
