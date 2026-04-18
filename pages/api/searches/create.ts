/**
 * API Endpoint: Create a new lead search
 * POST /api/searches/create
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { saveLeadSearch } from '../../../lib/leads';
import { LeadSearch } from '../../../lib/types/lead';

interface CreateSearchRequest {
  niche: string;
  state: string;
  city?: string;
  isActive: boolean;
}

interface CreateSearchResponse {
  success: boolean;
  message: string;
  searchId?: string;
  search?: LeadSearch;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CreateSearchResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
  }

  // Check authentication
  if (typeof window !== 'undefined' && typeof window !== 'undefined') {
    // Client-side auth check (for reference)
    // In production, verify sessionStorage or JWT
  }

  const { niche, state, city, isActive } = req.body as CreateSearchRequest;

  // Validation
  if (!niche || !state) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'niche and state are required',
    });
  }

  try {
    const searchId = await saveLeadSearch({
      niche: niche.trim(),
      state: state.trim(),
      city: city?.trim(),
      isActive: isActive !== false,
      dateCreated: new Date(),
      leadsFound: 0,
    });

    return res.status(201).json({
      success: true,
      message: `Search created: ${niche} in ${city || state}`,
      searchId,
      search: {
        id: searchId,
        niche,
        state,
        city,
        isActive: isActive !== false,
        dateCreated: new Date(),
        leadsFound: 0,
      },
    });
  } catch (error) {
    console.error('Error creating search:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create search',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
