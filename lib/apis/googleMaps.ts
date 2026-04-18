/**
 * Google Maps API Integration
 * Search for businesses by location and category/niche
 */

import { Lead } from '../types/lead';

interface GoogleMapsPlace {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
}

interface GooglePlacesTextSearchResponse {
  results: GoogleMapsPlace[];
  next_page_token?: string;
  status: string;
}

/**
 * Search for businesses on Google Maps by niche and location
 * Niche examples: "landscaping", "plumber", "hvac", "roofing"
 */
export async function searchGoogleMapsBusinesses(
  niche: string,
  state: string,
  city?: string,
  apiKey?: string
): Promise<{
  leads: Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated' | 'fingerprint'>[];
  totalResults: number;
  nextPageToken?: string;
}> {
  const key = apiKey || process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error('Google Maps API key not configured');
  }

  // Build search query
  const searchQuery = city ? `${niche} in ${city}, ${state}` : `${niche} in ${state}`;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${key}`
    );

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }

    const data: GooglePlacesTextSearchResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API returned status: ${data.status}`);
    }

    if (data.status === 'ZERO_RESULTS') {
      return { leads: [], totalResults: 0 };
    }

    // Transform Google Places results into Lead objects
    const leads = data.results
      .filter((place) => place.business_status === 'OPERATIONAL') // Only active businesses
      .map((place) => transformGooglePlaceToLead(place, niche, state, city));

    return {
      leads,
      totalResults: data.results.length,
      nextPageToken: data.next_page_token,
    };
  } catch (error) {
    console.error('Google Maps search error:', error);
    throw error;
  }
}

/**
 * Get details for a specific place
 * Fetches additional information like phone, website, reviews, etc.
 */
export async function getGooglePlaceDetails(
  placeId: string,
  apiKey?: string
): Promise<GoogleMapsPlace | null> {
  const key = apiKey || process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,business_status,geometry,types&key=${key}`
    );

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Places API returned status: ${data.status}`);
    }

    return data.result || null;
  } catch (error) {
    console.error('Google Place details error:', error);
    throw error;
  }
}

/**
 * Transform Google Places result into Lead object
 */
function transformGooglePlaceToLead(
  place: GoogleMapsPlace,
  niche: string,
  state: string,
  city?: string
): Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated' | 'fingerprint'> {
  // Parse address
  const addressParts = place.formatted_address?.split(',').map((s) => s.trim()) || [];
  const parsedCity = city || addressParts[0] || 'Unknown';
  const parsedZip = extractZipCode(place.formatted_address || '');

  // Parse phone
  const phone = place.formatted_phone_number?.replace(/[^\d+\-()]/g, '').trim();

  // Determine if has website
  const website = place.website || undefined;

  return {
    businessName: place.name,
    city: parsedCity,
    state: state,
    zipCode: parsedZip,
    primaryPhone: phone,
    website: website,
    googleRating: place.rating,
    googleReviewCount: place.user_ratings_total,
    primaryNiche: niche,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    sources: ['google-maps'],
    status: 'active',
    tags: [], // PHASE 5: Initialize empty tags
    ghlPushed: false, // PHASE 4: Initialize as not pushed
  };
}

/**
 * Extract zip code from formatted address
 */
function extractZipCode(address: string): string | undefined {
  const zipMatch = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
  return zipMatch ? zipMatch[1] : undefined;
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

/**
 * Get remaining quota for today (simplified - actual quota is managed by Google)
 */
export function getGoogleMapsQuotaStatus(): {
  quotaType: string;
  dailyLimit: number;
  note: string;
} {
  return {
    quotaType: 'Maps JavaScript API',
    dailyLimit: 25000, // Default for most plans
    note: 'Actual quota depends on your Google Cloud plan. Check Google Cloud Console for your specific limits.',
  };
}
