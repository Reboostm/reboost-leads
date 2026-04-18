/**
 * API Endpoint: GoHighLevel Webhook Listener
 * POST /api/ghl/webhook
 *
 * Receives events from GoHighLevel and updates lead engagement metrics
 * Events: email.opened, email.clicked, contact.updated, task.completed
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateLead, getLeads, logActivity } from '../../../lib/leads';

interface GHLWebhookPayload {
  type: string; // e.g., 'contact.email_opened', 'contact.email_clicked', 'contact.updated'
  contactId: string;
  locationId: string;
  timestamp: string;
  data?: {
    email?: string;
    status?: string;
    tags?: string[];
    customField?: Record<string, any>;
    emailCampaignId?: string;
  };
}

interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Only POST requests are allowed',
    });
  }

  const payload = req.body as GHLWebhookPayload;

  // Validate webhook
  if (!payload.type || !payload.contactId) {
    return res.status(400).json({
      success: false,
      error: 'Invalid webhook payload',
    });
  }

  try {
    console.log(`[GHL WEBHOOK] Received event: ${payload.type} for contact ${payload.contactId}`);

    // Find lead by GHL contact ID
    const allLeads = await getLeads();
    const lead = allLeads.find((l) => l.ghlContactId === payload.contactId);

    if (!lead) {
      console.warn(`[GHL WEBHOOK] Lead not found for contact ${payload.contactId}`);
      return res.status(200).json({
        success: true,
        message: 'Webhook received but lead not found (may be external contact)',
      });
    }

    // Handle different event types
    switch (payload.type) {
      case 'contact.email_opened': {
        // Increment email open count
        const updatedEmailsOpened = (lead.emailsOpened || 0) + 1;
        await updateLead(lead.id, {
          emailsOpened: updatedEmailsOpened,
          lastEmailOpenDate: new Date(),
          ghlEngagementLevel: 'opened',
        });

        await logActivity(
          lead.id,
          'email_opened',
          'Lead opened email in GHL campaign',
          { campaignId: payload.data?.emailCampaignId }
        );

        console.log(`[GHL WEBHOOK] Lead ${lead.id} opened email (total opens: ${updatedEmailsOpened})`);
        break;
      }

      case 'contact.email_clicked': {
        // Increment email click count
        const updatedEmailsClicked = (lead.emailsClicked || 0) + 1;
        const currentEngagement = lead.ghlEngagementLevel || 'none';
        const newEngagement = currentEngagement === 'replied' ? 'replied' : 'clicked';

        await updateLead(lead.id, {
          emailsClicked: updatedEmailsClicked,
          ghlEngagementLevel: newEngagement,
        });

        await logActivity(
          lead.id,
          'email_clicked',
          'Lead clicked link in email',
          { campaignId: payload.data?.emailCampaignId }
        );

        console.log(`[GHL WEBHOOK] Lead ${lead.id} clicked email link (total clicks: ${updatedEmailsClicked})`);
        break;
      }

      case 'contact.updated': {
        // Contact was updated in GHL
        const updates: any = {
          ghlStatus: payload.data?.status || lead.ghlStatus,
        };

        // Update email if provided
        if (payload.data?.email && !lead.primaryEmail) {
          updates.primaryEmail = payload.data.email;
        }

        // Update tags if provided
        if (payload.data?.tags && Array.isArray(payload.data.tags)) {
          const ghlTags = payload.data.tags.filter((t) => !lead.tags?.includes(t));
          if (ghlTags.length > 0) {
            updates.tags = [...(lead.tags || []), ...ghlTags];
          }
        }

        await updateLead(lead.id, updates);

        await logActivity(
          lead.id,
          'status_changed',
          `Contact updated in GHL: ${payload.data?.status || 'no status change'}`,
          payload.data
        );

        console.log(`[GHL WEBHOOK] Lead ${lead.id} updated in GHL`);
        break;
      }

      case 'contact.reply_received': {
        // Contact replied to email
        await updateLead(lead.id, {
          ghlEngagementLevel: 'replied',
          status: 'contacted',
        });

        await logActivity(
          lead.id,
          'email_opened',
          'Contact replied to email in GHL'
        );

        console.log(`[GHL WEBHOOK] Lead ${lead.id} replied to email`);
        break;
      }

      case 'task.completed': {
        // Task completed in GHL (e.g., "call lead")
        await logActivity(
          lead.id,
          'status_changed',
          'Task completed in GHL',
          { taskType: payload.data?.customField?.taskType }
        );

        console.log(`[GHL WEBHOOK] Task completed for lead ${lead.id}`);
        break;
      }

      default:
        console.log(`[GHL WEBHOOK] Unhandled event type: ${payload.type}`);
    }

    return res.status(200).json({
      success: true,
      message: `Processed event: ${payload.type}`,
    });
  } catch (error) {
    console.error('[GHL WEBHOOK] Error processing webhook:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process webhook',
    });
  }
}
