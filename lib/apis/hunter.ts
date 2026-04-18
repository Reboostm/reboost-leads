/**
 * Hunter.io API Integration
 * Email finding and verification for discovered businesses
 */

interface HunterEmailResult {
  email: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  seniority?: string;
  department?: string;
  confidence: number;
  twitter?: string;
  linkedin?: string;
  phone_number?: string;
}

interface HunterDomainSearchResponse {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  accept_all: boolean;
  pattern: string;
  organization: string;
  country: string;
  type: string;
  emails: HunterEmailResult[];
  linked_domains: string[];
  found_count?: number;
  last_update?: string;
}

interface HunterEmailFinderResponse {
  domain: string;
  emails: HunterEmailResult[];
  confidence?: number;
  sources?: Array<{
    domain: string;
    uri: string;
  }>;
}

/**
 * Find emails from a domain using Hunter.io
 * Can search by domain (get all company emails) or specific person
 */
export async function findEmailsFromDomain(
  domain: string,
  apiKey?: string
): Promise<{
  emails: HunterEmailResult[];
  totalFound: number;
}> {
  const key = apiKey || process.env.HUNTER_IO_API_KEY;

  if (!key) {
    throw new Error('Hunter.io API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=100&offset=0&api_key=${key}`
    );

    if (!response.ok) {
      const error = await response.json();
      if (error.errors?.some((e: any) => e.type === 'RATE_LIMIT_EXCEEDED')) {
        throw new Error('Hunter.io rate limit exceeded - quota for today used');
      }
      throw new Error(`Hunter.io API error: ${response.statusText}`);
    }

    const data: HunterDomainSearchResponse = await response.json();

    return {
      emails: data.emails || [],
      totalFound: data.found_count || data.emails?.length || 0,
    };
  } catch (error) {
    console.error('Hunter email search error:', error);
    throw error;
  }
}

/**
 * Find specific person's email using Hunter.io
 * Useful for finding owner/decision maker emails
 */
export async function findPersonEmail(
  domain: string,
  firstName?: string,
  lastName?: string,
  apiKey?: string
): Promise<HunterEmailResult | null> {
  const key = apiKey || process.env.HUNTER_IO_API_KEY;

  if (!key) {
    throw new Error('Hunter.io API key not configured');
  }

  const params = new URLSearchParams({
    domain: domain,
    api_key: key,
  });

  if (firstName) params.append('first_name', firstName);
  if (lastName) params.append('last_name', lastName);

  try {
    const response = await fetch(`https://api.hunter.io/v2/email-finder?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      if (error.errors?.some((e: any) => e.type === 'RATE_LIMIT_EXCEEDED')) {
        throw new Error('Hunter.io rate limit exceeded');
      }
      throw new Error(`Hunter.io API error: ${response.statusText}`);
    }

    const data: HunterEmailFinderResponse = await response.json();

    // Return the first email result if found
    if (data.emails && data.emails.length > 0) {
      return data.emails[0];
    }

    return null;
  } catch (error) {
    console.error('Hunter person email search error:', error);
    throw error;
  }
}

/**
 * Verify if an email is valid using Hunter.io
 */
export async function verifyEmail(
  email: string,
  apiKey?: string
): Promise<{
  email: string;
  valid: boolean;
  confidence: string;
}> {
  const key = apiKey || process.env.HUNTER_IO_API_KEY;

  if (!key) {
    throw new Error('Hunter.io API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`
    );

    if (!response.ok) {
      throw new Error(`Hunter.io API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      email: email,
      valid: data.result === 'deliverable',
      confidence: data.confidence || 'unknown',
    };
  } catch (error) {
    console.error('Hunter email verification error:', error);
    throw error;
  }
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts[1] || '';
}

/**
 * Extract domain from website URL
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

/**
 * Check if Hunter.io is configured
 */
export function isHunterConfigured(): boolean {
  return !!process.env.HUNTER_IO_API_KEY;
}

/**
 * Get Hunter.io quota info
 */
export function getHunterQuotaInfo(): {
  service: string;
  monthlyCalls: number;
  note: string;
} {
  return {
    service: 'Hunter.io',
    monthlyCalls: 100, // Free tier: 100 calls/month
    note: 'Free tier provides 100 API calls per month. Paid plans offer more quota.',
  };
}
