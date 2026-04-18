'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, LeadSearch } from '../../../lib/types/lead';
import { US_STATES, NICHES, LEAD_SOURCES, LEAD_STATUSES, getSourceInfo, getStatusLabel } from '../../../lib/constants';

interface DailyMetrics {
  date: string;
  newLeads: number;
  totalLeads: number;
  duplicateSkipped: number;
}

interface ExpandedLead {
  id: string;
  open: boolean;
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
    enrichWithEmails: true,
  });
  const [filtering, setFiltering] = useState({
    niche: 'all',
    state: '',
    status: 'active',
  });
  const [expandedLeads, setExpandedLeads] = useState<ExpandedLead[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nicheStats, setNicheStats] = useState<Record<string, number>>({});

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
      calculateNicheStats();
    }
  }, [isAuthed]);

  // Calculate niche counts
  useEffect(() => {
    calculateNicheStats();
  }, [leads]);

  const fetchSearches = async () => {
    try {
      const response = await fetch('/api/searches/list');
      if (response.ok) {
        const data = await response.json();
        setSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Error fetching searches:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      setMetrics({
        date: new Date().toLocaleDateString(),
        newLeads: 0,
        totalLeads: leads.length,
        duplicateSkipped: 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const calculateNicheStats = () => {
    const stats: Record<string, number> = {};
    leads.forEach((lead) => {
      const niche = lead.primaryNiche;
      stats[niche] = (stats[niche] || 0) + 1;
    });
    setNicheStats(stats);
  };

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFormData.niche || !searchFormData.state) {
      alert('Please fill in niche and state');
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch('/api/searches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: searchFormData.niche,
          state: searchFormData.state,
          city: searchFormData.city,
          isActive: true,
        }),
      });

      if (response.ok) {
        setSearchFormData({ niche: '', state: '', city: '', enrichWithEmails: true });
        setShowNewSearchForm(false);
        fetchSearches();
        alert('Search created successfully!');
      }
    } catch (error) {
      console.error('Error creating search:', error);
      alert('Error creating search');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSearch = async (searchId: string) => {
    const search = searches.find((s) => s.id === searchId);
    if (!search) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/scrape/execute-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_REBOOST_API_KEY || '',
        },
        body: JSON.stringify({
          niche: search.niche,
          state: search.state,
          city: search.city,
          enrichWithEmails: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Found ${result.results.newLeadsAdded} new leads!`);
        fetchSearches();
        fetchMetrics();
      }
    } catch (error) {
      console.error('Error executing search:', error);
      alert('Error executing search');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpandLead = (leadId: string) => {
    setExpandedLeads((prev) => {
      const isExpanded = prev.find((l) => l.id === leadId)?.open;
      if (isExpanded) {
        return prev.filter((l) => l.id !== leadId);
      } else {
        return [...prev, { id: leadId, open: true }];
      }
    });
  };

  const getFilteredLeads = () => {
    let filtered = leads;

    if (filtering.niche !== 'all') {
      filtered = filtered.filter((l) => l.primaryNiche === filtering.niche);
    }
    if (filtering.state) {
      filtered = filtered.filter((l) => l.state === filtering.state);
    }
    if (filtering.status) {
      filtered = filtered.filter((l) => l.status === filtering.status);
    }

    return filtered;
  };

  const isLeadExpanded = (leadId: string) => expandedLeads.find((l) => l.id === leadId)?.open || false;

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

  const filteredLeads = getFilteredLeads();

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
                  <select
                    value={searchFormData.niche}
                    onChange={(e) => setSearchFormData({ ...searchFormData, niche: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a niche...</option>
                    {NICHES.map((niche) => (
                      <option key={niche} value={niche}>
                        {niche}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">State *</label>
                  <select
                    value={searchFormData.state}
                    onChange={(e) => setSearchFormData({ ...searchFormData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a state...</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">City (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Salt Lake City"
                    value={searchFormData.city}
                    onChange={(e) => setSearchFormData({ ...searchFormData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="enrichEmails"
                  checked={searchFormData.enrichWithEmails}
                  onChange={(e) => setSearchFormData({ ...searchFormData, enrichWithEmails: e.target.checked })}
                  disabled={submitting}
                  className="w-4 h-4"
                />
                <label htmlFor="enrichEmails" className="text-sm text-gray-700">
                  ✉️ Enrich with Hunter.io emails (recommended)
                </label>
              </div>

              <div className="flex gap-4">
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
                        Found: {search.leadsFound} leads | Last run:{' '}
                        {search.dateLastRun ? new Date(search.dateLastRun).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExecuteSearch(search.id)}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                      >
                        {submitting ? 'Running...' : 'Run Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Leads Database */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leads Database</h2>

            {/* Niche Filter Tabs */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setFiltering({ ...filtering, niche: 'all' })}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                    filtering.niche === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Leads ({leads.length})
                </button>
                {Object.entries(nicheStats).map(([niche, count]) => (
                  <button
                    key={niche}
                    onClick={() => setFiltering({ ...filtering, niche })}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                      filtering.niche === niche
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {niche} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Filter by State</label>
                <select
                  value={filtering.state}
                  onChange={(e) => setFiltering({ ...filtering, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                >
                  <option value="">All States</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Filter by Status</label>
                <select
                  value={filtering.status}
                  onChange={(e) => setFiltering({ ...filtering, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                >
                  <option value="">All Statuses</option>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFiltering({ niche: 'all', state: '', status: '' })}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="p-6">
            {filteredLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {leads.length === 0 ? 'No leads found. Run a search to get started!' : 'No leads match your filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Business</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Source</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Contact</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Website</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Social</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Niche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const isExpanded = isLeadExpanded(lead.id);
                      const sourceInfo = getSourceInfo(lead.sources?.[0] || 'google-maps');

                      return (
                        <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleExpandLead(lead.id)}
                              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                            >
                              {isExpanded ? '▼' : '▶'} {lead.businessName}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                              style={{
                                backgroundColor: sourceInfo.bgColor,
                                color: sourceInfo.textColor,
                              }}
                            >
                              {sourceInfo.icon} {sourceInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div>
                              {lead.primaryPhone ? <a href={`tel:${lead.primaryPhone}`} className="text-indigo-600 hover:underline block">{lead.primaryPhone}</a> : '-'}
                            </div>
                            {lead.primaryEmail ? (
                              <a href={`mailto:${lead.primaryEmail}`} className="text-indigo-600 hover:underline text-xs">
                                {lead.primaryEmail}
                              </a>
                            ) : null}
                          </td>
                          <td className="py-3 px-4">
                            {lead.website ? (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                                🔗 Visit
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {lead.googleRating ? (
                              <div>
                                <div className="font-semibold">⭐ {lead.googleRating.toFixed(1)}</div>
                                <div className="text-gray-600 text-xs">({lead.googleReviewCount} reviews)</div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex gap-1">
                              {lead.linkedinUrl && (
                                <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                                  💼
                                </a>
                              )}
                              {lead.facebookUrl && (
                                <a href={lead.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook">
                                  👍
                                </a>
                              )}
                              {lead.instagramHandle && <span title="Instagram">📷</span>}
                              {lead.twitterHandle && <span title="Twitter">🐦</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {lead.city}, {lead.state} {lead.zipCode}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">{lead.primaryNiche}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Expandable Detail Rows */}
                {filteredLeads.map((lead) => {
                  if (!isLeadExpanded(lead.id)) return null;

                  return (
                    <div key={`detail-${lead.id}`} className="bg-indigo-50 border-t border-b border-indigo-200 p-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Contact Information */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">📞 Contact Information</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Primary:</span> {lead.primaryPhone ? <a href={`tel:${lead.primaryPhone}`} className="text-indigo-600">{lead.primaryPhone}</a> : 'N/A'}
                            </div>
                            {lead.mobilePhone && (
                              <div>
                                <span className="font-medium">Mobile:</span> <a href={`tel:${lead.mobilePhone}`} className="text-indigo-600">{lead.mobilePhone}</a>
                              </div>
                            )}
                            {lead.primaryEmail && (
                              <div>
                                <span className="font-medium">Email:</span> <a href={`mailto:${lead.primaryEmail}`} className="text-indigo-600">{lead.primaryEmail}</a>
                              </div>
                            )}
                            {lead.secondaryEmails && lead.secondaryEmails.length > 0 && (
                              <div>
                                <span className="font-medium">Other Emails:</span>
                                <div className="text-xs">
                                  {lead.secondaryEmails.map((email) => (
                                    <div key={email}>
                                      <a href={`mailto:${email}`} className="text-indigo-600">
                                        {email}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Business Information */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">🏢 Business Details</h4>
                          <div className="space-y-2 text-sm">
                            {lead.website && (
                              <div>
                                <span className="font-medium">Website:</span> <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600">Link</a>
                              </div>
                            )}
                            {lead.yearFounded && (
                              <div>
                                <span className="font-medium">Founded:</span> {lead.yearFounded}
                              </div>
                            )}
                            {lead.employeeCount && (
                              <div>
                                <span className="font-medium">Employees:</span> {lead.employeeCount}
                              </div>
                            )}
                            {lead.description && (
                              <div>
                                <span className="font-medium">Description:</span> {lead.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location & Status */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">📍 Location & Status</h4>
                          <div className="space-y-2 text-sm">
                            {lead.streetAddress && <div><span className="font-medium">Address:</span> {lead.streetAddress}</div>}
                            <div><span className="font-medium">City:</span> {lead.city}</div>
                            <div><span className="font-medium">State:</span> {lead.state}</div>
                            {lead.zipCode && <div><span className="font-medium">ZIP:</span> {lead.zipCode}</div>}
                            {lead.county && <div><span className="font-medium">County:</span> {lead.county}</div>}
                            <div className="mt-3 pt-3 border-t border-indigo-200">
                              <label className="font-medium">Status:</label>
                              <select
                                defaultValue={lead.status}
                                className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                              >
                                {LEAD_STATUSES.map((status) => (
                                  <option key={status.value} value={status.value}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social & Ratings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-indigo-200">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">⭐ Ratings</h4>
                          <div className="space-y-2 text-sm">
                            {lead.googleRating && <div>Google: {lead.googleRating}/5 ({lead.googleReviewCount} reviews)</div>}
                            {lead.yelpRating && <div>Yelp: {lead.yelpRating}/5 ({lead.yelpReviewCount} reviews)</div>}
                            {lead.bbbRating && <div>BBB: {lead.bbbRating}</div>}
                            {!lead.googleRating && !lead.yelpRating && !lead.bbbRating && <div className="text-gray-500">No ratings found</div>}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">🔗 Social Media</h4>
                          <div className="space-y-2 text-sm">
                            {lead.linkedinUrl && (
                              <div>
                                <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                                  💼 LinkedIn
                                </a>
                              </div>
                            )}
                            {lead.facebookUrl && (
                              <div>
                                <a href={lead.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600">
                                  👍 Facebook
                                </a>
                              </div>
                            )}
                            {lead.instagramHandle && <div>📷 Instagram: @{lead.instagramHandle}</div>}
                            {lead.twitterHandle && <div>🐦 Twitter: @{lead.twitterHandle}</div>}
                            {!lead.linkedinUrl && !lead.facebookUrl && !lead.instagramHandle && !lead.twitterHandle && (
                              <div className="text-gray-500">No social profiles found</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-6 pt-6 border-t border-indigo-200">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">📊 Metadata</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Found: {new Date(lead.dateFound).toLocaleDateString()}</div>
                          <div>Sources: {lead.sources?.join(', ') || 'Unknown'}</div>
                          {lead.dateLastUpdated && <div>Last Updated: {new Date(lead.dateLastUpdated).toLocaleDateString()}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
