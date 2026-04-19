/**
 * API Endpoint: List all leads
 * GET /api/leads/list
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeads } from '../../../lib/leads';

interface ListLeadsResponse {
  success: boolean;
  leads?: any[];
  total?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListLeadsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Only GET requests are allowed',
    });
  }

  try {
    const leads = await getLeads();

    return res.status(200).json({
      success: true,
      leads: leads || [],
      total: leads?.length || 0,
    });
  } catch (error) {
    console.error('Error listing leads:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list leads',
    });
  }
}
