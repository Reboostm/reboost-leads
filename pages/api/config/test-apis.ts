/**
 * API Endpoint: Test API Connections
 * POST /api/config/test-apis
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface TestApiRequest {
  googleMapsApiKey?: string;
  hunterIOApiKey?: string;
}

interface TestApiResponse {
  success: boolean;
  message: string;
  results?: {
    googleMaps?: {
      success: boolean;
      message: string;
    };
    hunterIO?: {
      success: boolean;
      message: string;
    };
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<TestApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST requests are allowed',
    });
  }

  const { googleMapsApiKey, hunterIOApiKey } = req.body as TestApiRequest;
  const results: any = {};

  // Test Google Maps API
  if (googleMapsApiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=pizza&key=${googleMapsApiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        results.googleMaps = {
          success: true,
          message: `✓ Google Maps API is working! Found ${data.results?.length || 0} results.`,
        };
      } else if (data.status === 'REQUEST_DENIED') {
        results.googleMaps = {
          success: false,
          message: '❌ Invalid API key or Places API not enabled. Check your Google Cloud Console.',
        };
      } else {
        results.googleMaps = {
          success: false,
          message: `❌ Error: ${data.status} - ${data.error_message || 'Unknown error'}`,
        };
      }
    } catch (error) {
      results.googleMaps = {
        success: false,
        message: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Test Hunter.io API
  if (hunterIOApiKey) {
    try {
      const response = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=google.com&api_key=${hunterIOApiKey}`
      );

      const data = await response.json();

      if (response.ok) {
        results.hunterIO = {
          success: true,
          message: `✓ Hunter.io API is working! Found ${data.found_count || 0} emails.`,
        };
      } else if (data.errors?.some((e: any) => e.type === 'INVALID_API_KEY')) {
        results.hunterIO = {
          success: false,
          message: '❌ Invalid Hunter.io API key. Check your Account Settings.',
        };
      } else {
        results.hunterIO = {
          success: false,
          message: `❌ Error: ${data.errors?.[0]?.message || 'Unknown error'}`,
        };
      }
    } catch (error) {
      results.hunterIO = {
        success: false,
        message: `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  const allSuccess = Object.values(results).every((r: any) => r.success);

  return res.status(200).json({
    success: allSuccess,
    message: allSuccess ? '✓ All APIs working!' : '⚠️ Some APIs need fixing',
    results,
  });
}
