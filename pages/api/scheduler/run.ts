/**
 * API Endpoint: Scheduler Run
 * POST /api/scheduler/run
 *
 * Called hourly by external cron (Vercel Cron, EasyCron, etc.)
 * Executes all scheduled searches that are due to run
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getScheduledSearchesToRun, recordSearchExecution } from '@/lib/scheduler';
import { getLeadSearches } from '@/lib/leads';

interface SchedulerRunResponse {
  success: boolean;
  message: string;
  searchesExecuted: number;
  results?: Array<{
    searchId: string;
    niche: string;
    state: string;
    status: 'success' | 'failed';
    leadsFound?: number;
    newLeads?: number;
    error?: string;
  }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SchedulerRunResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      searchesExecuted: 0,
      error: 'Only POST requests are allowed',
    });
  }

  // Optional: Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      searchesExecuted: 0,
      error: 'Invalid or missing CRON_SECRET',
    });
  }

  try {
    // Get searches that should run now
    const scheduledSearches = await getScheduledSearchesToRun();

    if (scheduledSearches.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No searches scheduled for this hour',
        searchesExecuted: 0,
      });
    }

    const results: SchedulerRunResponse['results'] = [];

    // Execute each scheduled search
    for (const search of scheduledSearches) {
      try {
        console.log(
          `[Scheduler] Executing search: ${search.niche} in ${search.state} (ID: ${search.id})`
        );

        // Call the execute-search endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scrape/execute-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchId: search.id,
            niche: search.niche,
            state: search.state,
            city: search.city,
            maxLeads: search.maxLeads,
            // Include search preferences
            enableHunterIO: true, // Can be configurable later
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const searchResult = await response.json();

        // Record execution in scheduler
        await recordSearchExecution(
          search.id,
          searchResult.totalLeadsFound || 0,
          searchResult.newLeadsAdded || 0
        );

        results.push({
          searchId: search.id,
          niche: search.niche,
          state: search.state,
          status: 'success',
          leadsFound: searchResult.totalLeadsFound || 0,
          newLeads: searchResult.newLeadsAdded || 0,
        });

        console.log(
          `[Scheduler] ✓ Search completed: ${searchResult.newLeadsAdded || 0} new leads`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduler] ✗ Search failed: ${errorMessage}`);

        results.push({
          searchId: search.id,
          niche: search.niche,
          state: search.state,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    // Count successes
    const successCount = results.filter((r) => r.status === 'success').length;

    return res.status(200).json({
      success: true,
      message: `Executed ${successCount}/${results.length} scheduled searches`,
      searchesExecuted: successCount,
      results,
    });
  } catch (error) {
    console.error('[Scheduler] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      message: 'Scheduler execution failed',
      searchesExecuted: 0,
      error: errorMessage,
    });
  }
}
