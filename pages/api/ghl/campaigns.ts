/**
 * API Endpoint: Get Available GHL Campaigns
 * GET /api/ghl/campaigns
 *
 * Fetches available email campaigns from GoHighLevel
 * PHASE 4 Enhancement
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getGHLCampaigns } from '../../../lib/ghl';

interface CampaignsQuery {
  ghlApiKey?: string;
  ghlLocationId?: string;
}

interface CampaignsResponse {
  success: boolean;
  campaigns?: Array<{
    id: string;
    name: string;
    type?: string;
    status?: string;
  }>;
  message?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CampaignsResponse>) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only GET requests are allowed',
    });
  }

  const { ghlApiKey, ghlLocationId } = req.query as CampaignsQuery;

  // Validation
  if (!ghlApiKey || !ghlLocationId) {
    return res.status(400).json({
      success: false,
      error: 'ghlApiKey and ghlLocationId query parameters are required',
    });
  }

  try {
    console.log('[GHL] Fetching available campaigns...');

    const campaigns = await getGHLCampaigns({
      apiKey: ghlApiKey as string,
      locationId: ghlLocationId as string,
    });

    return res.status(200).json({
      success: true,
      campaigns,
      message: `Found ${campaigns.length} campaigns`,
    });
  } catch (error) {
    console.error('[GHL] Error fetching campaigns:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch campaigns',
    });
  }
}
