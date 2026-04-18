/**
 * ReBoost Leads Constants
 * Configuration for dropdowns, sources, and display options
 */

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

// Common service niches for dropdown selection
export const NICHES = [
  'Landscaping',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Pressure Washing',
  'Electrician',
  'Cleaning',
  'General Contractor',
  'Painting',
  'Pest Control',
  'Concrete',
  'Carpentry',
  'Masonry',
  'Drywall',
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
