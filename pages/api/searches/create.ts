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
  isActive?: boolean; // Legacy field
  // PHASE 1: Quota Control
  status?: 'active' | 'paused' | 'completed';
  maxLeads?: number;
  searchCount?: number;
  // PHASE 2: Scheduling
  scheduledFrequency?: 'once' | 'daily';
  scheduledTime?: string;
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

  const { niche, state, city, isActive, status, maxLeads, searchCount, scheduledFrequency, scheduledTime } = req.body as CreateSearchRequest;

  // Validation
  if (!niche || !state) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'niche and state are required',
    });
  }

  // Validate maxLeads if provided
  if (maxLeads && (maxLeads < 1 || maxLeads > 500)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid maxLeads',
      error: 'maxLeads must be between 1 and 500',
    });
  }

  try {
    // Determine status (new system or legacy)
    const finalStatus = status || (isActive !== false ? 'active' : 'paused');

    const searchId = await saveLeadSearch({
      niche: niche.trim(),
      state: state.trim(),
      city: city?.trim(),
      // PHASE 1: Status and quota control
      status: finalStatus,
      maxLeads: maxLeads || 100, // Default 100
      searchCount: searchCount || 0,
      // PHASE 2: Scheduling
      scheduledFrequency,
      scheduledTime: scheduledFrequency === 'daily' ? scheduledTime : undefined,
      // Backward compatibility
      isActive: finalStatus === 'active',
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
        status: finalStatus,
        maxLeads: maxLeads || 100,
        searchCount: searchCount || 0,
        scheduledFrequency,
        scheduledTime: scheduledFrequency === 'daily' ? scheduledTime : undefined,
        isActive: finalStatus === 'active',
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
