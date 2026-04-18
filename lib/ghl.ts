/**
 * GoHighLevel Integration
 * Handles pushing leads and managing workflows
 * PHASE 4 Implementation
 */

import { Lead } from './types/lead';

export interface GHLConfig {
  apiKey: string;
  locationId: string;
  baseUrl?: string;
}

export interface GHLContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customField?: Record<string, any>;
}

export interface GHLPushResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

/**
 * Format lead data for GHL API
 */
export function formatLeadForGHL(lead: Lead): GHLContact {
  const firstName = lead.businessName.split(' ')[0];
  const lastName = lead.businessName.split(' ').slice(1).join(' ') || 'Business';

  return {
    firstName,
    lastName,
    email: lead.primaryEmail,
    phone: lead.primaryPhone,
    address: lead.streetAddress,
    city: lead.city,
    state: lead.state,
    postalCode: lead.zipCode,
    customField: {
      website: lead.website,
      rating: lead.googleRating,
      reviewCount: lead.googleReviewCount,
      niche: lead.primaryNiche,
      sources: lead.sources,
    },
  };
}

/**
 * Push a single lead to GoHighLevel
 */
export async function pushLeadToGHL(
  lead: Lead,
  config: GHLConfig
): Promise<GHLPushResult> {
  try {
    const contact = formatLeadForGHL(lead);
    const baseUrl = config.baseUrl || 'https://rest.gohighlevel.com/v1';

    const response = await fetch(`${baseUrl}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        postalCode: contact.postalCode,
        locationId: config.locationId,
        tags: ['reBoost-lead', ...((lead.tags || []) as string[])],
        customFields: contact.customField,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GHL API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      contactId: data.contact?.id,
    };
  } catch (error) {
    console.error('[GHL] Error pushing lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Push multiple leads to GoHighLevel
 */
export async function pushLeadsToGHL(
  leads: Lead[],
  config: GHLConfig
): Promise<{
  successCount: number;
  failureCount: number;
  results: GHLPushResult[];
}> {
  const results: GHLPushResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const lead of leads) {
    try {
      const result = await pushLeadToGHL(lead, config);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Rate limiting: sleep between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failureCount++;
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { successCount, failureCount, results };
}

/**
 * Get available workflows from GHL
 */
export async function getGHLWorkflows(config: GHLConfig): Promise<
  Array<{
    id: string;
    name: string;
    description?: string;
  }>
> {
  try {
    const baseUrl = config.baseUrl || 'https://rest.gohighlevel.com/v1';

    const response = await fetch(`${baseUrl}/locations/${config.locationId}/workflows`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }

    const data = await response.json();

    return data.workflows || [];
  } catch (error) {
    console.error('[GHL] Error fetching workflows:', error);
    return [];
  }
}

/**
 * Assign lead to a workflow
 */
export async function assignLeadToWorkflow(
  contactId: string,
  workflowId: string,
  config: GHLConfig
): Promise<boolean> {
  try {
    const baseUrl = config.baseUrl || 'https://rest.gohighlevel.com/v1';

    const response = await fetch(`${baseUrl}/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to assign workflow: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('[GHL] Error assigning workflow:', error);
    return false;
  }
}
