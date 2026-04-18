/**
 * API Endpoint: Push Leads to GoHighLevel
 * POST /api/ghl/push-leads
 *
 * Pushes selected leads to GoHighLevel campaigns
 * PHASE 4 Implementation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLead, updateLead } from '../../../lib/leads';
import { pushLeadsToGHL, getGHLWorkflows, addContactToCampaign } from '../../../lib/ghl';

interface PushLeadsRequest {
  leadIds: string[];
  workflowId?: string;
  campaignId?: string; // Email campaign to add leads to
  ghlApiKey: string;
  ghlLocationId: string;
}

interface PushLeadsResponse {
  success: boolean;
  message: string;
  successCount?: number;
  failureCount?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PushLeadsResponse>) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
  }

  const { leadIds, workflowId, campaignId, ghlApiKey, ghlLocationId } = req.body as PushLeadsRequest;

  // Validation
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      error: 'leadIds must be a non-empty array',
    });
  }

  if (!ghlApiKey || !ghlLocationId) {
    return res.status(400).json({
      success: false,
      message: 'Missing GoHighLevel credentials',
      error: 'ghlApiKey and ghlLocationId are required',
    });
  }

  try {
    console.log(`[GHL] Pushing ${leadIds.length} leads to GoHighLevel${campaignId ? ` to campaign ${campaignId}` : ''}...`);

    // Fetch all leads
    const leads = [];
    for (const leadId of leadIds) {
      const lead = await getLead(leadId);
      if (lead) {
        leads.push(lead);
      }
    }

    if (leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid leads found',
        error: 'Could not find any of the specified leads',
      });
    }

    // Push leads to GHL
    const result = await pushLeadsToGHL(leads, {
      apiKey: ghlApiKey,
      locationId: ghlLocationId,
    });

    console.log(`[GHL] Push complete: ${result.successCount} successful, ${result.failureCount} failed`);

    // Update leads in database to mark as pushed and add to campaign
    for (let i = 0; i < result.results.length; i++) {
      const pushResult = result.results[i];
      const lead = leads[i];

      try {
        const updateData: any = {
          ghlPushed: true,
          dateGhlPushed: new Date(),
          ghlStatus: pushResult.success ? 'pushed' : 'failed',
        };

        // Store contact ID if push was successful
        if (pushResult.success && pushResult.contactId) {
          updateData.ghlContactId = pushResult.contactId;

          // Add to campaign if specified
          if (campaignId) {
            const campaignSuccess = await addContactToCampaign(
              pushResult.contactId,
              campaignId,
              {
                apiKey: ghlApiKey,
                locationId: ghlLocationId,
              }
            );

            if (campaignSuccess) {
              updateData.ghlCampaignId = campaignId;
              updateData.ghlEngagementLevel = 'none'; // Initialize engagement level
              console.log(`[GHL] Added contact ${pushResult.contactId} to campaign ${campaignId}`);
            } else {
              console.warn(`[GHL] Failed to add contact ${pushResult.contactId} to campaign ${campaignId}`);
            }
          }
        }

        await updateLead(lead.id, updateData);
      } catch (error) {
        console.warn(`[GHL] Failed to update lead ${lead.id} in database:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Pushed ${result.successCount} leads to GoHighLevel${campaignId ? ' and added to email campaign' : ''}${result.failureCount > 0 ? ` (${result.failureCount} failed)` : ''}`,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    console.error('[GHL] Error pushing leads:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to push leads to GoHighLevel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
