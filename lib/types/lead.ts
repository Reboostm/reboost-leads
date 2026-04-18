/**
 * Complete Lead Data Model for ReBoost Leads
 * Captures comprehensive contact and business information for outreach
 */

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
  status: 'active' | 'contacted' | 'archived' | 'deleted';

  // GHL Integration
  ghlWorkflowId?: string;
  ghlCampaignId?: string;
  ghlStatus?: string;
  dateGhlPushed?: Date;

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
  isActive: boolean;
  dateCreated: Date;
  dateLastRun?: Date;
  leadsFound: number; // Total leads found across all runs
  newLeadsToday?: number;
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
