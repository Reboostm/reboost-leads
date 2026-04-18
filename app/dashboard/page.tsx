'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

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

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('reboost_auth');
    }
    router.push('/login');
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ReBoost Leads Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to ReBoost Leads!</h2>
          <div className="space-y-3">
            <p className="text-gray-700">
              You are now logged into the ReBoost Leads admin portal.
            </p>
            <p className="text-gray-700">
              This is your dashboard where you can manage leads and configure the lead generation system.
            </p>
          </div>

          <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-2">✓ Authentication Working</h3>
            <p className="text-indigo-800 text-sm">
              Authentication is properly configured and working. You can now build out the lead generation features!
            </p>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/dashboard/leads"
                className="p-4 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
              >
                <h4 className="font-semibold text-indigo-600 mb-2">→ Lead Management</h4>
                <p className="text-sm text-gray-600">
                  Search for leads, manage searches, and view your lead database
                </p>
              </a>
              <a
                href="/dashboard/api-setup"
                className="p-4 border border-green-200 rounded-lg hover:bg-green-50 transition"
              >
                <h4 className="font-semibold text-green-600 mb-2">→ API Configuration</h4>
                <p className="text-sm text-gray-600">
                  Set up Google Maps, Hunter.io, and other API credentials
                </p>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
