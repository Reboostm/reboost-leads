/**
 * API Endpoint: Update a lead search
 * PUT /api/searches/update
 *
 * Used to:
 * - Pause/resume searches
 * - Mark searches as completed
 * - Update scheduling
 * PHASE 1 & 2 Implementation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateLeadSearch } from '../../../lib/leads';
import { getNextRunTime } from '../../../lib/scheduler';

interface UpdateSearchRequest {
  searchId: string;
  status?: 'active' | 'paused' | 'completed';
  scheduledTime?: string;
  scheduledFrequency?: 'once' | 'daily';
}

interface UpdateSearchResponse {
  success: boolean;
  message: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UpdateSearchResponse>) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only PUT requests are allowed',
    });
  }

  const { searchId, status, scheduledTime, scheduledFrequency } = req.body as UpdateSearchRequest;

  // Validation
  if (!searchId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      error: 'searchId is required',
    });
  }

  try {
    const updates: Record<string, any> = {};

    // PHASE 1: Update status
    if (status) {
      updates.status = status;

      if (status === 'completed') {
        updates.completedDate = new Date();
      }
    }

    // PHASE 2: Update scheduling
    if (scheduledFrequency) {
      updates.scheduledFrequency = scheduledFrequency;
    }

    if (scheduledTime) {
      updates.scheduledTime = scheduledTime;
    }

    // Calculate next run time if daily frequency
    if (updates.scheduledFrequency === 'daily' || scheduledFrequency === 'daily') {
      // We would need to fetch the search to calculate properly
      // For now, just let the scheduler recalculate it
      updates.nextRunTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
        error: 'At least one field (status, scheduledTime, scheduledFrequency) is required',
      });
    }

    await updateLeadSearch(searchId, updates);

    let message = '';
    if (status === 'paused') {
      message = 'Search paused';
    } else if (status === 'active') {
      message = 'Search resumed';
    } else if (status === 'completed') {
      message = 'Search marked as completed';
    } else {
      message = 'Search updated';
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error updating search:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update search',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
