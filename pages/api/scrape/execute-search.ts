/**
 * API Endpoint: Execute a lead search
 * POST /api/scrape/execute-search
 *
 * Executes a search by niche and location, scrapes Google Maps, enriches with Hunter.io
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { searchGoogleMapsBusinesses } from '../../../lib/apis/googleMaps';
import { findEmailsFromDomain, extractDomainFromUrl } from '../../../lib/apis/hunter';
import { batchCreateLeads, getLeadsCount, updateLeadSearch, markSearchCompleted, getLeadSearches } from '../../../lib/leads';
import { Lead } from '../../../lib/types/lead';

interface ExecuteSearchRequest {
  niche: string;
  state: string;
  city?: string;
  enrichWithEmails?: boolean; // Whether to use Hunter.io to find emails
  // PHASE 1: Quota control
  searchId?: string; // Search record ID for updating status
  maxLeads?: number; // Maximum leads to find (default 100)
}

interface ExecuteSearchResponse {
  success: boolean;
  message: string;
  results?: {
    leadsFound: number;
    newLeadsAdded: number;
    duplicatesSkipped: number;
    failedImports: number;
    leadsProcessed: Array<{
      name: string;
      city: string;
      state: string;
      email?: string;
      phone?: string;
    }>;
    totalLeadsInSystem: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExecuteSearchResponse>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
  }

  // Check authentication
  if (typeof req.headers['x-api-key'] !== 'string' || req.headers['x-api-key'] !== process.env.REBOOST_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid or missing API key',
    });
  }

  const { niche, state, city, enrichWithEmails, searchId, maxLeads } = req.body as ExecuteSearchRequest;

  // Validation
  if (!niche || !state) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'niche and state are required',
    });
  }

  // PHASE 1: Validate maxLeads
  const MAX_LEADS_LIMIT = 500;
  const finalMaxLeads = Math.min(maxLeads || 100, MAX_LEADS_LIMIT);

  try {
    console.log(`[SEARCH] Starting search: ${niche} in ${city || state} (max: ${finalMaxLeads} leads)`);

    // Step 1: Search Google Maps
    const googleResults = await searchGoogleMapsBusinesses(niche, state, city);
    console.log(`[SEARCH] Found ${googleResults.leads.length} leads from Google Maps`);

    // PHASE 1: Trim to maxLeads quota
    const leadsToProcess = googleResults.leads.slice(0, finalMaxLeads);
    console.log(`[SEARCH] Processing ${leadsToProcess.length} leads (limited to ${finalMaxLeads} max)`);

    // Step 2: Enrich with Hunter.io if enabled
    let enrichedLeads = leadsToProcess;

    if (enrichWithEmails && leadsToProcess.length > 0) {
      console.log('[SEARCH] Enriching leads with Hunter.io...');
      enrichedLeads = await enrichLeadsWithEmails(leadsToProcess);
    }

    // Step 3: Batch create leads with deduplication
    const batchResult = await batchCreateLeads(enrichedLeads);
    console.log(
      `[SEARCH] Results - Created: ${batchResult.created}, Duplicates: ${batchResult.duplicates}, Failed: ${batchResult.failed}`
    );

    // PHASE 1: Update search status if quota reached
    if (searchId) {
      const totalLeadsFound = (googleResults.leads.length || 0) + (batchResult.created || 0);

      // If we found maxLeads or more from this run, mark search as completed
      if (googleResults.leads.length >= finalMaxLeads) {
        console.log(`[SEARCH] Quota reached (${finalMaxLeads}), marking search as completed`);
        await markSearchCompleted(searchId, totalLeadsFound);
      } else {
        // Otherwise just update search stats
        await updateLeadSearch(searchId, {
          leadsFound: totalLeadsFound,
          dateLastRun: new Date(),
          searchCount: (await getLeadSearches()).find((s) => s.id === searchId)?.searchCount || 0 + 1,
        });
      }
    }

    // Step 4: Get total count for this niche/state
    const totalLeads = await getLeadsCount(niche, state, city);

    // Step 5: Format response
    const processedLeads = enrichedLeads
      .filter((_, index) => batchResult.newLeads.includes(batchResult.newLeads[index]))
      .slice(0, 10) // Return first 10 for preview
      .map((lead) => ({
        name: lead.businessName,
        city: lead.city,
        state: lead.state,
        email: lead.primaryEmail,
        phone: lead.primaryPhone,
      }));

    return res.status(200).json({
      success: true,
      message: `Successfully scraped ${batchResult.created} new leads for ${niche} in ${city || state}`,
      results: {
        leadsFound: googleResults.leads.length,
        newLeadsAdded: batchResult.created,
        duplicatesSkipped: batchResult.duplicates,
        failedImports: batchResult.failed,
        leadsProcessed: processedLeads,
        totalLeadsInSystem: totalLeads,
      },
    });
  } catch (error) {
    console.error('[SEARCH ERROR]', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return res.status(500).json({
      success: false,
      message: 'Search execution failed',
      error: errorMessage,
    });
  }
}

/**
 * Enrich leads with email addresses from Hunter.io
 */
async function enrichLeadsWithEmails(leads: Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated' | 'fingerprint'>[]): Promise<Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated' | 'fingerprint'>[]> {
  let enrichedCount = 0;

  for (const lead of leads) {
    try {
      // Skip if no website
      if (!lead.website) {
        continue;
      }

      // Extract domain and search for emails
      const domain = extractDomainFromUrl(lead.website);
      const emailResults = await findEmailsFromDomain(domain);

      // Add primary email if found
      if (emailResults.emails.length > 0) {
        lead.primaryEmail = emailResults.emails[0].email;

        // Add additional emails if available
        if (emailResults.emails.length > 1) {
          lead.secondaryEmails = emailResults.emails.slice(1).map((e) => e.email);
        }

        enrichedCount++;
      }

      // Rate limiting: Hunter.io free tier has limits
      // Sleep 100ms between requests to be safe
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      // Log but don't fail the whole batch
      console.warn(`[ENRICHMENT WARNING] Failed to enrich ${lead.businessName}:`, error);
    }
  }

  console.log(`[ENRICHMENT] Successfully enriched ${enrichedCount}/${leads.length} leads with emails`);
  return leads;
}
