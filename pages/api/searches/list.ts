/**
 * API Endpoint: Get all lead searches
 * GET /api/searches/list
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeadSearches } from '../../../lib/leads';
import { LeadSearch } from '../../../lib/types/lead';

interface ListSearchesResponse {
  success: boolean;
  message: string;
  searches?: LeadSearch[];
  count?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListSearchesResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only GET requests are allowed',
    });
  }

  try {
    const searches = await getLeadSearches();

    return res.status(200).json({
      success: true,
      message: `Retrieved ${searches.length} searches`,
      searches,
      count: searches.length,
    });
  } catch (error) {
    console.error('Error fetching searches:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch searches',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
