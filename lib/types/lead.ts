/**
 * Complete Lead Data Model for ReBoost Leads
 * Captures comprehensive contact and business information for outreach
 */

export interface Activity {
  id: string;
  leadId: string;
  type: 'created' | 'tagged' | 'status_changed' | 'ghl_pushed' | 'email_sent' | 'email_opened' | 'email_clicked' | 'note_added' | 'scored' | 'campaign_added';
  description: string;
  metadata?: Record<string, any>; // e.g., { tag: 'high-value', oldStatus: 'active', newStatus: 'contacted' }
  timestamp: Date;
  userId?: string; // Who performed the action
}

export interface Lead {
  // Unique Identifiers
  id: string; // Firestore document ID
  fingerprint: string; // Hash for deduplication (name + city + state + phone)

  // Business Information
  businessName: string;
  description?: string;
  website?: string;
  businessLogoUrl?: string;
  yearFounded?: number;
  employeeCount?: string;

  // Website Analysis (Tech Stack, Tracking, Ads)
  websiteTechStack?: string; // e.g., "WordPress", "Shopify", "Custom"
  trackingPixels?: string[]; // e.g., ["Google Analytics", "Facebook Pixel"]
  adPlatforms?: string[]; // e.g., ["Google Ads", "Facebook Ads"]
  hasSSL?: boolean; // Whether website has SSL certificate

  // Primary Contact Information (CRITICAL FOR OUTREACH)
  primaryEmail?: string;
  secondaryEmails?: string[];
  primaryPhone?: string;
  mobilePhone?: string;
  alternativePhone?: string;

  // Social Media & Online Presence
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;

  // Location Data (Full Hierarchy)
  streetAddress?: string;
  city: string;
  county?: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;

  // Industry & Classification
  primaryNiche: string; // e.g., "Landscaping"
  secondaryCategories?: string[];
  customNiche?: string; // User-defined for one-offs

  // Reviews & Reputation (for lead scoring)
  googleRating?: number;
  googleReviewCount?: number;
  yelpRating?: number;
  yelpReviewCount?: number;
  bbbRating?: string;
  trustScore?: number;

  // System Metadata
  dateFound: Date; // When lead was first scraped
  dateLastUpdated: Date; // Last update date
  sources: string[]; // Where it came from: ["google-maps", "hunter.io", etc.]
  status: 'active' | 'contacted' | 'converted' | 'rejected' | 'archived' | 'deleted';

  // User Annotations & Tags
  tags: string[]; // User-added tags (e.g., ["high-value", "follow-up", "contacted"])
  notes?: string; // Custom notes from user

  // GHL Integration
  ghlWorkflowId?: string;
  ghlCampaignId?: string; // Email campaign ID in GHL
  ghlContactId?: string; // GHL contact ID
  ghlPushed: boolean; // Whether lead has been pushed to GoHighLevel
  ghlStatus?: string;
  dateGhlPushed?: Date;

  // Email Engagement (from GHL)
  emailsOpened?: number; // Number of emails opened in GHL campaign
  emailsClicked?: number; // Number of links clicked in emails
  lastEmailOpenDate?: Date; // When lead last opened an email
  ghlEngagementLevel?: 'none' | 'opened' | 'clicked' | 'replied'; // Highest engagement level

  // Tracking & Analytics
  lastContactAttempt?: Date;
  contactAttemptCount?: number;
  conversionStatus?: 'new' | 'interested' | 'converted' | 'rejected';

  // Search/Import Context
  searchQueryId?: string; // Which search query found this lead
  importBatchId?: string; // Which daily import batch added it
}

export interface LeadSearch {
  id: string;
  niche: string; // e.g., "Landscaping"
  state: string; // e.g., "Utah"
  city?: string; // Optional: specific city

  // Status & Lifecycle
  status: 'active' | 'paused' | 'completed'; // Replaces isActive
  isActive?: boolean; // Legacy field for backward compatibility

  // Quota Control (PHASE 1)
  maxLeads: number; // Default 100, max 500 - limits results per run
  leadsFound: number; // Total leads found across all runs
  newLeadsToday?: number;
  searchCount: number; // How many times this search has been executed
  completedDate?: Date; // When search reached max leads quota

  // Scheduling (PHASE 2)
  scheduledTime?: string; // e.g., "09:00" for 9 AM
  scheduledFrequency?: 'once' | 'daily'; // One-time or recurring

  // Tracking
  dateCreated: Date;
  dateLastRun?: Date;
  nextRunTime?: Date;
}

export interface DailyImportMetrics {
  id: string;
  date: Date;
  totalLeadsProcessed: number;
  newLeadsAdded: number;
  duplicatesSkipped: number;
  failedImports: number;
  apiQuotaUsed: Record<string, number>; // e.g., { "google-maps": 245, "hunter.io": 67 }
  searchResults: Array<{
    niche: string;
    state: string;
    leadsFound: number;
    newLeads: number;
  }>;
}

export interface ApiCredential {
  id: string;
  service: 'google-maps' | 'hunter-io' | 'rocket-reach' | 'apollo' | 'linkedin';
  apiKey: string;
  accountIndex: number; // For rotation (account 1, 2, 3, etc.)
  dailyQuota: number;
  quotaUsedToday: number;
  dateQuotaResets: Date;
  isActive: boolean;
}
