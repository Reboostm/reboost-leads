'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApiStatus {
  service: string;
  configured: boolean;
  quotaInfo?: string;
  status: 'connected' | 'not-configured' | 'error';
}

export default function ApiSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus[]>([]);
  const [envVars, setEnvVars] = useState({
    googleMapsApiKey: '',
    hunterIoApiKey: '',
    reboostApiKey: '',
    cronSecret: '',
  });

  // Check authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authed = sessionStorage.getItem('reboost_auth') === 'true';
      if (!authed) {
        router.push('/login');
      } else {
        setIsAuthed(true);
      }
      setLoading(false);
    }
  }, [router]);

  // Check API status
  useEffect(() => {
    if (isAuthed) {
      checkApiStatus();
    }
  }, [isAuthed]);

  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/config/check-apis');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.apis || []);
      }
    } catch (error) {
      console.error('Error checking API status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">API Configuration</h1>
          <div className="flex gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
              Dashboard
            </a>
            <a href="/dashboard/leads" className="text-gray-600 hover:text-gray-900 font-medium">
              Leads
            </a>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('reboost_auth');
                }
                router.push('/login');
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Setup Required</h2>
          <p className="text-blue-800 mb-4">
            To start scraping leads, you need to set up API keys for Google Maps and Hunter.io. Follow the guide below to get started.
          </p>
          <a
            href="https://github.com/yourusername/reboost-leads/blob/main/API_SETUP_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
          >
            📖 Read Full Setup Guide
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* API Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Google Maps */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Google Maps API</h3>
                <p className="text-sm text-gray-600 mt-1">Search businesses by location & category</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                apiStatus.find((a) => a.service === 'google-maps')?.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {apiStatus.find((a) => a.service === 'google-maps')?.configured ? '✓ Connected' : 'Not Set'}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="Paste your Google Maps API key"
                  value={envVars.googleMapsApiKey}
                  onChange={(e) => setEnvVars({ ...envVars, googleMapsApiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                />
              </div>
              <p className="text-xs text-gray-600">
                Get your key from{' '}
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                  Google Cloud Console
                </a>
              </p>
              {apiStatus.find((a) => a.service === 'google-maps')?.quotaInfo && (
                <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
                  📊 {apiStatus.find((a) => a.service === 'google-maps')?.quotaInfo}
                </p>
              )}
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-sm transition">
                Test Connection
              </button>
            </div>
          </div>

          {/* Hunter.io */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Hunter.io API</h3>
                <p className="text-sm text-gray-600 mt-1">Find business email addresses</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                apiStatus.find((a) => a.service === 'hunter-io')?.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {apiStatus.find((a) => a.service === 'hunter-io')?.configured ? '✓ Connected' : 'Not Set'}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="Paste your Hunter.io API key"
                  value={envVars.hunterIoApiKey}
                  onChange={(e) => setEnvVars({ ...envVars, hunterIoApiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                />
              </div>
              <p className="text-xs text-gray-600">
                Get your key from{' '}
                <a href="https://app.hunter.io/account/settings" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                  Hunter.io Account Settings
                </a>
              </p>
              {apiStatus.find((a) => a.service === 'hunter-io')?.quotaInfo && (
                <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
                  📊 {apiStatus.find((a) => a.service === 'hunter-io')?.quotaInfo}
                </p>
              )}
              <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                ⚠️ Free tier: 100 calls/month. Consider multiple accounts for higher volume.
              </div>
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-sm transition">
                Test Connection
              </button>
            </div>
          </div>
        </div>

        {/* Internal Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Internal Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">ReBoost API Key</label>
              <input
                type="password"
                placeholder="Your internal API key"
                value={envVars.reboostApiKey}
                onChange={(e) => setEnvVars({ ...envVars, reboostApiKey: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-xs text-gray-600 mt-1">Used to authenticate API requests from your dashboard</p>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Cron Secret Token</label>
              <input
                type="password"
                placeholder="Your cron secret token"
                value={envVars.cronSecret}
                onChange={(e) => setEnvVars({ ...envVars, cronSecret: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-xs text-gray-600 mt-1">Used to secure daily scheduler triggers</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⚠️ <strong>Important:</strong> These keys should be set in your `.env.local` file locally and as environment variables on Vercel/your hosting provider.{' '}
              <strong>Never share these keys publicly.</strong>
            </p>
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Setup Checklist</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="step1"
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                defaultChecked={false}
              />
              <label htmlFor="step1" className="flex-1">
                <span className="font-medium text-gray-900">Google Maps API Set Up</span>
                <p className="text-sm text-gray-600">Created project, enabled APIs, and got API key</p>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="step2"
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                defaultChecked={false}
              />
              <label htmlFor="step2" className="flex-1">
                <span className="font-medium text-gray-900">Hunter.io Account Created</span>
                <p className="text-sm text-gray-600">Created account and have API key ready</p>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="step3"
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                defaultChecked={false}
              />
              <label htmlFor="step3" className="flex-1">
                <span className="font-medium text-gray-900">Keys Added to .env.local</span>
                <p className="text-sm text-gray-600">All API keys are in your environment variables</p>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="step4"
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                defaultChecked={false}
              />
              <label htmlFor="step4" className="flex-1">
                <span className="font-medium text-gray-900">Keys Deployed to Vercel</span>
                <p className="text-sm text-gray-600">Environment variables are set in Vercel settings</p>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="step5"
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                defaultChecked={false}
              />
              <label htmlFor="step5" className="flex-1">
                <span className="font-medium text-gray-900">Tested Search Execution</span>
                <p className="text-sm text-gray-600">Ran a test search and got results</p>
              </label>
            </div>
          </div>

          <button className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition">
            All Done! Go to Lead Management →
          </button>
        </div>
      </main>
    </div>
  );
}
