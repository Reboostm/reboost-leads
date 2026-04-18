/**
 * Daily Scraping Job
 * GET /api/scrape/daily
 *
 * Runs all active searches and logs metrics
 * Should be triggered by a cron job (EasyCron, Vercel cron, etc.) daily around 12:05 AM
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeadSearches, updateLeadSearch, logImportMetrics, getLeadsCount } from '../../../lib/leads';
import { searchGoogleMapsBusinesses } from '../../../lib/apis/googleMaps';
import { findEmailsFromDomain, extractDomainFromUrl } from '../../../lib/apis/hunter';
import { batchCreateLeads } from '../../../lib/leads';
import { Lead } from '../../../lib/types/lead';

interface DailyJobResponse {
  success: boolean;
  message: string;
  jobId?: string;
  metrics?: {
    totalSearches: number;
    searchesExecuted: number;
    totalLeadsProcessed: number;
    totalNewLeads: number;
    totalDuplicates: number;
    totalFailed: number;
    searchResults: Array<{
      niche: string;
      state: string;
      leadsFound: number;
      newLeads: number;
    }>;
    executionTime: number;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<DailyJobResponse>) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only GET requests are allowed',
    });
  }

  // Security: Verify with a secret token or API key
  const secretToken = req.headers['x-cron-secret'];
  if (secretToken !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid cron secret',
    });
  }

  const startTime = Date.now();
  const jobId = `daily-scrape-${new Date().toISOString().split('T')[0]}`;

  try {
    console.log(`[DAILY JOB ${jobId}] Starting daily scrape job...`);

    // Step 1: Get all active searches
    const searches = await getLeadSearches();
    const activeSearches = searches.filter((s) => s.isActive);

    console.log(`[DAILY JOB] Found ${activeSearches.length} active searches`);

    if (activeSearches.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active searches configured',
        jobId,
        metrics: {
          totalSearches: 0,
          searchesExecuted: 0,
          totalLeadsProcessed: 0,
          totalNewLeads: 0,
          totalDuplicates: 0,
          totalFailed: 0,
          searchResults: [],
          executionTime: Date.now() - startTime,
        },
      });
    }

    // Step 2: Execute each search
    let totalLeadsProcessed = 0;
    let totalNewLeads = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;
    const searchResults = [];

    for (const search of activeSearches) {
      try {
        console.log(`[DAILY JOB] Processing search: ${search.niche} in ${search.city || search.state}`);

        // Execute search
        const googleResults = await searchGoogleMapsBusinesses(search.niche, search.state, search.city);
        let enrichedLeads = googleResults.leads;

        // Enrich with Hunter.io
        try {
          enrichedLeads = await enrichLeadsWithEmails(googleResults.leads);
        } catch (enrichError) {
          console.warn(`[DAILY JOB] Hunter.io enrichment failed (may be quota limit):`, enrichError);
          // Continue with non-enriched leads
        }

        // Batch create (with deduplication)
        const batchResult = await batchCreateLeads(enrichedLeads);

        totalLeadsProcessed += googleResults.leads.length;
        totalNewLeads += batchResult.created;
        totalDuplicates += batchResult.duplicates;
        totalFailed += batchResult.failed;

        // Get total count
        const totalCount = await getLeadsCount(search.niche, search.state, search.city);

        searchResults.push({
          niche: search.niche,
          state: search.state,
          leadsFound: googleResults.leads.length,
          newLeads: batchResult.created,
        });

        // Update search with latest metrics
        await updateLeadSearch(search.id, {
          dateLastRun: new Date(),
          leadsFound: totalCount,
          newLeadsToday: batchResult.created,
          nextRunTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        });

        console.log(`[DAILY JOB] ${search.niche} - Found: ${googleResults.leads.length}, New: ${batchResult.created}`);
      } catch (searchError) {
        console.error(`[DAILY JOB ERROR] Failed to process search ${search.niche}:`, searchError);
        totalFailed++;
      }
    }

    // Step 3: Log metrics
    const executionTime = Date.now() - startTime;
    await logImportMetrics({
      totalLeadsProcessed,
      newLeadsAdded: totalNewLeads,
      duplicatesSkipped: totalDuplicates,
      failedImports: totalFailed,
      apiQuotaUsed: {
        'google-maps': Math.min(activeSearches.length, 300), // Approximate
      },
      searchResults,
    });

    console.log(`[DAILY JOB ${jobId}] Completed in ${executionTime}ms`);

    return res.status(200).json({
      success: true,
      message: `Daily scrape job completed. Added ${totalNewLeads} new leads.`,
      jobId,
      metrics: {
        totalSearches: activeSearches.length,
        searchesExecuted: searchResults.length,
        totalLeadsProcessed,
        totalNewLeads,
        totalDuplicates,
        totalFailed,
        searchResults,
        executionTime,
      },
    });
  } catch (error) {
    console.error(`[DAILY JOB ${jobId} ERROR]`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return res.status(500).json({
      success: false,
      message: 'Daily scrape job failed',
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
      if (!lead.website) continue;

      const domain = extractDomainFromUrl(lead.website);
      const emailResults = await findEmailsFromDomain(domain);

      if (emailResults.emails.length > 0) {
        lead.primaryEmail = emailResults.emails[0].email;
        if (emailResults.emails.length > 1) {
          lead.secondaryEmails = emailResults.emails.slice(1).map((e) => e.email);
        }
        enrichedCount++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`[ENRICHMENT] Failed for ${lead.businessName}:`, error);
    }
  }

  return leads;
}
