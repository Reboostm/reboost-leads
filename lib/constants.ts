/**
 * ReBoost Leads Constants
 * Configuration for dropdowns, sources, and display options
 */

// API EXPLANATIONS (for user education)
export const API_EXPLANATIONS = {
  googleMaps: {
    name: '🗺️ Google Maps API',
    description: 'Finds businesses by location + service type (e.g., "House Cleaners in Salt Lake City")',
    whatYouGet: [
      'Business name',
      'Phone number',
      'Address & location',
      'Website URL',
      'Google rating & review count',
      'Business hours',
    ],
    cost: 'FREE tier: $200/month free credit (plenty for most)',
    setup: 'https://console.cloud.google.com/marketplace/product/google/maps-backend.googleapis.com',
  },
  hunterIO: {
    name: '✉️ Hunter.io API',
    description: 'Finds EMAIL ADDRESSES for businesses (using their website domain)',
    whatYouGet: ['Business email addresses', 'Contact person names', 'Email verification (95%+ accurate)'],
    cost: 'FREE tier: 100 emails/month. Paid: $99-999/month',
    freeWorkaround: 'Create 5 Hunter accounts = 500 emails/month FREE',
    setup: 'https://app.hunter.io/account/settings',
  },
};

// LEAD STATUS EXPLANATIONS
export const STATUS_HELP = {
  active: {
    label: 'Active',
    help: 'New lead, not yet contacted',
  },
  contacted: {
    label: 'Contacted',
    help: 'We sent email/call, waiting for response',
  },
  converted: {
    label: 'Converted',
    help: 'Lead responded, became customer/client',
  },
  rejected: {
    label: 'Rejected',
    help: 'Lead not interested, not a fit',
  },
  archived: {
    label: 'Archived',
    help: 'Old lead, keeping but not actively pursuing',
  },
};

// US States for dropdown selection
export const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

// Common service niches for dropdown selection - SPECIFIC to customize outreach
export const NICHES = [
  // Cleaning Services
  'House Cleaning - Residential',
  'Commercial Cleaning - Offices',
  'Carpet Cleaning & Restoration',
  'Pressure Washing - Residential',
  'Pressure Washing - Commercial',

  // Outdoor Services
  'Landscaping - Residential',
  'Landscaping - Commercial',
  'Tree Trimming & Removal',
  'Lawn Care & Maintenance',

  // Home Services
  'Plumbing - Residential',
  'Plumbing - Commercial',
  'HVAC - Residential',
  'HVAC - Commercial',
  'Electrician - Residential',
  'Electrician - Commercial',
  'Roofing - Residential',
  'Roofing - Commercial',

  // Specialized Services
  'Pest Control - Residential',
  'Pest Control - Commercial',
  'General Contractor',
  'Painting - Residential',
  'Painting - Commercial',
  'Concrete & Masonry',
  'Carpentry',
  'Drywall & Insulation',

  // Legal Services
  'Lawyer - Divorce & Family Law',
  'Lawyer - Bankruptcy',
  'Lawyer - Personal Injury',
  'Lawyer - Criminal Defense',
  'Lawyer - DUI & Traffic',

  // Catch-all
  'Custom',
];

// Lead source configurations
export const LEAD_SOURCES = {
  'google-maps': {
    label: 'Google Maps',
    color: '#4285F4',
    bgColor: '#E8F0FE',
    textColor: '#1F2937',
    icon: '🗺️',
  },
  'hunter.io': {
    label: 'Hunter.io',
    color: '#FF6B35',
    bgColor: '#FFF5F0',
    textColor: '#1F2937',
    icon: '✉️',
  },
  yelp: {
    label: 'Yelp',
    color: '#FF0000',
    bgColor: '#FEE2E2',
    textColor: '#1F2937',
    icon: '⭐',
  },
  bbb: {
    label: 'BBB',
    color: '#0066CC',
    bgColor: '#EFF6FF',
    textColor: '#1F2937',
    icon: '🏢',
  },
  apollo: {
    label: 'Apollo.io',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    textColor: '#1F2937',
    icon: '🚀',
  },
  rocketreach: {
    label: 'RocketReach',
    color: '#06B6D4',
    bgColor: '#ECFDF5',
    textColor: '#1F2937',
    icon: '🎯',
  },
};

// Lead statuses for dropdown selection
export const LEAD_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
];

// Conversion statuses for lead tracking
export const CONVERSION_STATUSES = ['new', 'interested', 'converted', 'rejected'] as const;

// Lead quality filters (for filtering and customizing outreach)
export const LEAD_QUALITY_FILTERS = [
  {
    id: 'has-website',
    label: 'Has Website',
    help: 'Lead has a business website (professional, easier to research)',
  },
  {
    id: 'no-website',
    label: 'No Website',
    help: 'Lead has no website (newer business or sole proprietor)',
  },
  {
    id: 'has-email',
    label: 'Email Found',
    help: 'We found a business email (ready for email campaigns)',
  },
  {
    id: 'no-email',
    label: 'No Email Found',
    help: 'Could not find email (phone-only or private)',
  },
  {
    id: 'has-google-reviews',
    label: 'Has Google Reviews',
    help: 'Business has ratings/reviews (established, legitimate)',
  },
  {
    id: 'no-google-reviews',
    label: 'No Google Reviews',
    help: 'No reviews found (new or not optimized)',
  },
  {
    id: 'has-social',
    label: 'Has Social Media',
    help: 'LinkedIn/Facebook/Instagram found (social proof)',
  },
  {
    id: 'no-social',
    label: 'No Social Media',
    help: 'No social profiles found',
  },
  {
    id: 'high-rating',
    label: '4+ Star Rating',
    help: 'Google rating 4.0 or higher (quality business)',
  },
  {
    id: 'low-rating',
    label: 'Under 4 Stars',
    help: 'Lower ratings (might be struggling)',
  },
];

// API availability
export const AVAILABLE_APIS = {
  googleMaps: {
    name: 'Google Maps',
    description: 'Search businesses by location and category',
    defaultEnabled: true,
  },
  hunterIO: {
    name: 'Hunter.io',
    description: 'Find business email addresses',
    defaultEnabled: true,
  },
  apolloIO: {
    name: 'Apollo.io',
    description: 'B2B contact database',
    defaultEnabled: false,
  },
  rocketReach: {
    name: 'RocketReach',
    description: 'Professional contact finder',
    defaultEnabled: false,
  },
};

// Scheduling options
export const SCHEDULE_FREQUENCIES = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const SCHEDULE_TIMES = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

/**
 * Get source info by source key
 */
export function getSourceInfo(sourceKey: string) {
  return LEAD_SOURCES[sourceKey as keyof typeof LEAD_SOURCES] || LEAD_SOURCES['google-maps'];
}

/**
 * Get status color by status value
 */
export function getStatusColor(status: string) {
  return LEAD_STATUSES.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-800';
}

/**
 * Get status label by status value
 */
export function getStatusLabel(status: string) {
  return LEAD_STATUSES.find((s) => s.value === status)?.label || status;
}
