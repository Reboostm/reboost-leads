/**
 * API Endpoint: Analytics Dashboard Data
 * GET /api/analytics/dashboard
 *
 * Returns comprehensive analytics on leads, searches, and performance
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeads, getLeadSearches } from '../../../lib/leads';
import { generateAnalytics, Analytics } from '../../../lib/analytics';

interface AnalyticsResponse {
  success: boolean;
  data?: Analytics;
  error?: string;
  generatedAt?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Only GET requests are allowed',
    });
  }

  try {
    console.log('[ANALYTICS] Generating dashboard analytics...');

    // Fetch all data
    const [leads, searches] = await Promise.all([
      getLeads(),
      getLeadSearches(),
    ]);

    // Generate analytics
    const analytics = generateAnalytics(leads, searches);

    console.log('[ANALYTICS] Dashboard analytics generated successfully');

    return res.status(200).json({
      success: true,
      data: analytics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ANALYTICS] Error generating analytics:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate analytics',
    });
  }
}
