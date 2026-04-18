'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, LeadSearch } from '../../../lib/types/lead';

interface DailyMetrics {
  date: string;
  newLeads: number;
  totalLeads: number;
  duplicateSkipped: number;
}

export default function LeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searches, setSearches] = useState<LeadSearch[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [showNewSearchForm, setShowNewSearchForm] = useState(false);
  const [searchFormData, setSearchFormData] = useState({
    niche: '',
    state: '',
    city: '',
  });
  const [filtering, setFiltering] = useState({
    niche: '',
    state: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch data
  useEffect(() => {
    if (isAuthed) {
      fetchSearches();
      fetchMetrics();
    }
  }, [isAuthed]);

  const fetchSearches = async () => {
    try {
      // In a real app, fetch from API
      // For now, show placeholder
      setSearches([]);
    } catch (error) {
      console.error('Error fetching searches:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      // In a real app, fetch from API
      setMetrics({
        date: new Date().toLocaleDateString(),
        newLeads: 0,
        totalLeads: 0,
        duplicateSkipped: 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Call API to create search
      const response = await fetch('/api/searches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...searchFormData,
          isActive: true,
        }),
      });

      if (response.ok) {
        setSearchFormData({ niche: '', state: '', city: '' });
        setShowNewSearchForm(false);
        fetchSearches();
      }
    } catch (error) {
      console.error('Error creating search:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSearch = async (searchId: string) => {
    try {
      const response = await fetch('/api/scrape/execute-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_REBOOST_API_KEY || '',
        },
        body: JSON.stringify(searches.find((s) => s.id === searchId)),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Found ${result.results.newLeadsAdded} new leads!`);
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error executing search:', error);
      alert('Error executing search');
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
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <div className="flex gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
              Dashboard
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
        {/* Daily Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">New Leads Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics.newLeads}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Leads</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{metrics.totalLeads}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Duplicates Skipped</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{metrics.duplicateSkipped}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Last Update</p>
              <p className="text-lg font-bold text-gray-900 mt-2">{metrics.date}</p>
            </div>
          </div>
        )}

        {/* Active Searches */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Active Searches</h2>
            <button
              onClick={() => setShowNewSearchForm(!showNewSearchForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition"
            >
              + New Search
            </button>
          </div>

          {/* New Search Form */}
          {showNewSearchForm && (
            <form onSubmit={handleCreateSearch} className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Niche *</label>
                  <input
                    type="text"
                    placeholder="e.g., Landscaping, Plumbing"
                    value={searchFormData.niche}
                    onChange={(e) => setSearchFormData({ ...searchFormData, niche: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">State *</label>
                  <input
                    type="text"
                    placeholder="e.g., Utah, Texas"
                    value={searchFormData.state}
                    onChange={(e) => setSearchFormData({ ...searchFormData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">City (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Salt Lake City"
                    value={searchFormData.city}
                    onChange={(e) => setSearchFormData({ ...searchFormData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Search'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewSearchForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Searches List */}
          <div className="p-6">
            {searches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No searches configured yet. Create one to get started!</p>
            ) : (
              <div className="space-y-4">
                {searches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {search.niche} in {search.city ? `${search.city}, ` : ''}{search.state}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Found: {search.leadsFound} | Last run: {search.dateLastRun ? new Date(search.dateLastRun).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExecuteSearch(search.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm transition"
                      >
                        Run Now
                      </button>
                      <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-1 px-3 rounded text-sm transition">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leads List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leads Database</h2>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Filter by niche..."
                value={filtering.niche}
                onChange={(e) => setFiltering({ ...filtering, niche: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <input
                type="text"
                placeholder="Filter by state..."
                value={filtering.state}
                onChange={(e) => setFiltering({ ...filtering, state: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <select
                value={filtering.status}
                onChange={(e) => setFiltering({ ...filtering, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="active">Active</option>
                <option value="contacted">Contacted</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {leads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No leads found. Run a search to get started!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Business Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Phone</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Email</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Location</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Niche</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                            {lead.businessName}
                          </a>
                        </td>
                        <td className="py-2 px-4">{lead.primaryPhone || '-'}</td>
                        <td className="py-2 px-4">
                          {lead.primaryEmail ? (
                            <a href={`mailto:${lead.primaryEmail}`} className="text-indigo-600 hover:text-indigo-700 text-sm">
                              {lead.primaryEmail}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-4 text-sm">
                          {lead.city}, {lead.state} {lead.zipCode}
                        </td>
                        <td className="py-2 px-4 text-sm">{lead.primaryNiche}</td>
                        <td className="py-2 px-4">
                          <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
