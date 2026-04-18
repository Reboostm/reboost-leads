/**
 * API Endpoint: Check API Configuration Status
 * GET /api/config/check-apis
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isGoogleMapsConfigured, getGoogleMapsQuotaStatus } from '../../../lib/apis/googleMaps';
import { isHunterConfigured, getHunterQuotaInfo } from '../../../lib/apis/hunter';

interface ApiStatusInfo {
  service: string;
  configured: boolean;
  status: 'connected' | 'not-configured' | 'error';
  quotaInfo?: string;
}

interface CheckApisResponse {
  success: boolean;
  apis: ApiStatusInfo[];
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CheckApisResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      apis: [],
      message: 'Method not allowed',
    });
  }

  const apis: ApiStatusInfo[] = [];

  // Check Google Maps
  const googleMapsConfigured = isGoogleMapsConfigured();
  if (googleMapsConfigured) {
    const quotaStatus = getGoogleMapsQuotaStatus();
    apis.push({
      service: 'google-maps',
      configured: true,
      status: 'connected',
      quotaInfo: `Quota: ${quotaStatus.dailyLimit.toLocaleString()} requests/day`,
    });
  } else {
    apis.push({
      service: 'google-maps',
      configured: false,
      status: 'not-configured',
      quotaInfo: 'Not configured',
    });
  }

  // Check Hunter.io
  const hunterConfigured = isHunterConfigured();
  if (hunterConfigured) {
    const quotaInfo = getHunterQuotaInfo();
    apis.push({
      service: 'hunter-io',
      configured: true,
      status: 'connected',
      quotaInfo: `Quota: ${quotaInfo.monthlyCalls} calls/month (free tier)`,
    });
  } else {
    apis.push({
      service: 'hunter-io',
      configured: false,
      status: 'not-configured',
      quotaInfo: 'Not configured',
    });
  }

  return res.status(200).json({
    success: true,
    apis,
    message: `${apis.filter((a) => a.configured).length}/${apis.length} APIs configured`,
  });
}
