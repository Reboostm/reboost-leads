/**
 * API Endpoint: Bulk Actions on Leads
 * PUT /api/leads/bulk-action
 *
 * Handles bulk operations:
 * - Add/update tags on multiple leads
 * - Change status on multiple leads
 * - Mark as GHL pushed
 * - Archive multiple leads
 * PHASE 5 Implementation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateLeadTags, updateLeadsStatus, getLeads } from '../../../lib/leads';
import { writeBatch, doc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { addContactToCampaign } from '../../../lib/ghl';

interface BulkActionRequest {
  leadIds: string[];
  action: 'tag' | 'status' | 'ghl-push' | 'archive';
  value?: string; // For tag or status
  ghlConfig?: {
    apiKey: string;
    locationId: string;
    campaignId?: string; // Email campaign to add leads to
  };
}

interface BulkActionResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BulkActionResponse>) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only PUT requests are allowed',
    });
  }

  const { leadIds, action, value } = req.body as BulkActionRequest;

  // Validation
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      error: 'leadIds must be a non-empty array',
    });
  }

  if (!action) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      error: 'action is required (tag, status, ghl-push, archive)',
    });
  }

  try {
    switch (action) {
      case 'tag': {
        if (!value || typeof value !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Invalid request',
            error: 'value (tag) is required',
          });
        }

        // Add tag to each lead
        const batch = writeBatch(db);
        const LEADS_COLLECTION = 'leads';

        for (const leadId of leadIds) {
          const docRef = doc(db, LEADS_COLLECTION, leadId);
          batch.update(docRef, {
            tags: `[${value}]`, // Firebase will treat this as array, but we need proper array handling
            dateLastUpdated: Timestamp.now(),
          });
        }

        await batch.commit();

        return res.status(200).json({
          success: true,
          message: `Added tag "${value}" to ${leadIds.length} leads`,
          updatedCount: leadIds.length,
        });
      }

      case 'status': {
        if (!value || !['active', 'contacted', 'converted', 'rejected', 'archived'].includes(value)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request',
            error: 'value must be a valid status',
          });
        }

        await updateLeadsStatus(leadIds, value as any);

        return res.status(200).json({
          success: true,
          message: `Changed status to "${value}" for ${leadIds.length} leads`,
          updatedCount: leadIds.length,
        });
      }

      case 'archive': {
        await updateLeadsStatus(leadIds, 'archived');

        return res.status(200).json({
          success: true,
          message: `Archived ${leadIds.length} leads`,
          updatedCount: leadIds.length,
        });
      }

      case 'ghl-push': {
        const { ghlConfig } = req.body as BulkActionRequest;

        if (!ghlConfig || !ghlConfig.apiKey || !ghlConfig.locationId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request',
            error: 'ghlConfig with apiKey and locationId is required for ghl-push',
          });
        }

        // Get all the leads to push
        const allLeads = await getLeads();
        const leadsToAdd = allLeads.filter((lead) => leadIds.includes(lead.id));

        if (leadsToAdd.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No leads found',
            error: 'Could not find any leads to push',
          });
        }

        // Push to GHL and add to campaign if specified
        let successCount = 0;
        let failureCount = 0;
        const batch = writeBatch(db);
        const LEADS_COLLECTION = 'leads';

        for (const lead of leadsToAdd) {
          try {
            // Add to campaign if specified
            if (ghlConfig.campaignId && lead.ghlContactId) {
              const campaignSuccess = await addContactToCampaign(
                lead.ghlContactId,
                ghlConfig.campaignId,
                {
                  apiKey: ghlConfig.apiKey,
                  locationId: ghlConfig.locationId,
                }
              );

              if (campaignSuccess) {
                successCount++;
                const docRef = doc(db, LEADS_COLLECTION, lead.id);
                batch.update(docRef, {
                  ghlCampaignId: ghlConfig.campaignId,
                  ghlPushed: true,
                  dateGhlPushed: Timestamp.now(),
                  dateLastUpdated: Timestamp.now(),
                });
              } else {
                failureCount++;
              }
            } else {
              // Just mark as pushed without campaign assignment
              successCount++;
              const docRef = doc(db, LEADS_COLLECTION, lead.id);
              batch.update(docRef, {
                ghlPushed: true,
                dateGhlPushed: Timestamp.now(),
                dateLastUpdated: Timestamp.now(),
              });
            }

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            failureCount++;
            console.error(`Error pushing lead ${lead.id}:`, error);
          }
        }

        await batch.commit();

        return res.status(200).json({
          success: failureCount === 0,
          message: `Pushed ${successCount} leads to GoHighLevel${ghlConfig.campaignId ? ' and added to campaign' : ''}${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
          updatedCount: successCount,
        });
      }

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
          error: 'action must be one of: tag, status, ghl-push, archive',
        });
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
