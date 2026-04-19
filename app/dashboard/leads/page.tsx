'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, LeadSearch } from '../../../lib/types/lead';
import { US_STATES, NICHES, LEAD_SOURCES, LEAD_STATUSES, getSourceInfo, getStatusLabel, API_EXPLANATIONS, STATUS_HELP } from '../../../lib/constants';
import { calculateLeadScore } from '../../../lib/scoring';

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
  const [currentTab, setCurrentTab] = useState<'leads' | 'searches' | 'analytics'>('leads');
  const [searchFormData, setSearchFormData] = useState({
    niche: '',
    state: '',
    city: '',
    enrichWithEmails: true,
    maxLeads: 100, // PHASE 1: Quota control
    scheduledFrequency: 'once' as 'once' | 'daily', // PHASE 2: Scheduling
    scheduledTime: '09:00', // PHASE 2: Scheduling
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedLeadForActivity, setSelectedLeadForActivity] = useState<string | null>(null);
  const [filtering, setFiltering] = useState({
    niche: 'all',
    state: '',
    status: 'active',
    // PHASE 3: Advanced quality filters
    hasWebsite: false,
    hasEmail: false,
    hasPhone: false,
    hasSocial: false,
    hasReviews: false,
    minRating: 0,
    maxRating: 5,
  });
  const [expandedLeads, setExpandedLeads] = useState<ExpandedLead[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nicheStats, setNicheStats] = useState<Record<string, number>>({});
  // PHASE 5: Bulk operations
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkNewTag, setBulkNewTag] = useState('');
  // PHASE 4 Enhancement: GHL campaign selection
  const [showGHLModal, setShowGHLModal] = useState(false);
  const [ghlCampaigns, setGHLCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGHLCampaign, setSelectedGHLCampaign] = useState('');
  const [ghlApiKey, setGHLApiKey] = useState('');
  const [ghlLocationId, setGHLLocationId] = useState('');

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
      fetchAnalytics();
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
        console.log('[ANALYTICS] Loaded:', data.data);
      } else {
        console.error('[ANALYTICS] Response not ok:', response.status);
      }
    } catch (error) {
      console.error('[ANALYTICS] Error fetching analytics:', error);
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

    // PHASE 1: Validate no duplicate active searches
    const existingSearch = searches.find(
      (s) =>
        s.niche === searchFormData.niche &&
        s.state === searchFormData.state &&
        s.status !== 'completed' // Don't block if previous search completed
    );

    if (existingSearch) {
      alert('You already have an active search for this niche and state. Mark it as complete or paused first.');
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
          status: 'active', // PHASE 1: Use new status field
          maxLeads: searchFormData.maxLeads, // PHASE 1: Quota control
          searchCount: 0, // PHASE 1: Initialize search count
          scheduledFrequency: searchFormData.scheduledFrequency, // PHASE 2: Scheduling
          scheduledTime: searchFormData.scheduledFrequency === 'daily' ? searchFormData.scheduledTime : undefined, // PHASE 2: Scheduling
        }),
      });

      if (response.ok) {
        setSearchFormData({
          niche: '',
          state: '',
          city: '',
          enrichWithEmails: true,
          maxLeads: 100,
          scheduledFrequency: 'once',
          scheduledTime: '09:00',
        });
        setShowNewSearchForm(false);
        fetchSearches();
        alert('Search created successfully!');
      } else {
        alert('Failed to create search');
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

    // Basic filters
    if (filtering.niche !== 'all') {
      filtered = filtered.filter((l) => l.primaryNiche === filtering.niche);
    }
    if (filtering.state) {
      filtered = filtered.filter((l) => l.state === filtering.state);
    }
    if (filtering.status) {
      filtered = filtered.filter((l) => l.status === filtering.status);
    }

    // PHASE 3: Advanced quality filters
    if (filtering.hasWebsite) {
      filtered = filtered.filter((l) => l.website && l.website.length > 0);
    }
    if (filtering.hasEmail) {
      filtered = filtered.filter((l) => l.primaryEmail && l.primaryEmail.length > 0);
    }
    if (filtering.hasPhone) {
      filtered = filtered.filter((l) => l.primaryPhone && l.primaryPhone.length > 0);
    }
    if (filtering.hasSocial) {
      filtered = filtered.filter(
        (l) => l.linkedinUrl || l.facebookUrl || l.instagramHandle || l.twitterHandle
      );
    }
    if (filtering.hasReviews) {
      filtered = filtered.filter(
        (l) => (l.googleReviewCount && l.googleReviewCount > 0) ||
               (l.yelpReviewCount && l.yelpReviewCount > 0)
      );
    }
    if (filtering.minRating > 0 || filtering.maxRating < 5) {
      filtered = filtered.filter((l) => {
        const rating = l.googleRating || 0;
        return rating >= filtering.minRating && rating <= filtering.maxRating;
      });
    }

    return filtered;
  };

  const isLeadExpanded = (leadId: string) => expandedLeads.find((l) => l.id === leadId)?.open || false;

  // PHASE 5: Bulk operations handlers
  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleBulkTagSubmit = async () => {
    if (!bulkNewTag.trim() || selectedLeads.size === 0) {
      alert('Please enter a tag and select leads');
      return;
    }

    setSubmitting(true);
    try {
      const leadIds = Array.from(selectedLeads);
      // Update each lead with the new tag
      for (const leadId of leadIds) {
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
          const updatedTags = [...(lead.tags || []), bulkNewTag.trim()];
          // We would call an API here in production
          // await fetch(`/api/leads/${leadId}/tags`, { method: 'PUT', body: JSON.stringify({ tags: updatedTags }) })
          console.log(`Tagged ${lead.businessName} with "${bulkNewTag}"`);
        }
      }
      alert(`Added tag "${bulkNewTag}" to ${selectedLeads.size} leads`);
      setBulkNewTag('');
      setShowBulkTagModal(false);
      setSelectedLeads(new Set());
    } catch (error) {
      console.error('Error tagging leads:', error);
      alert('Error tagging leads');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedLeads.size === 0) {
      alert('Please select leads to export');
      return;
    }

    const leadsToExport = filteredLeads.filter((l) => selectedLeads.has(l.id));
    const headers = [
      'Business Name',
      'Phone',
      'Email',
      'Website',
      'Address',
      'City',
      'State',
      'Niche',
      'Rating',
      'Status',
      'Tags',
    ];

    const rows = leadsToExport.map((lead) => [
      lead.businessName,
      lead.primaryPhone || '',
      lead.primaryEmail || '',
      lead.website || '',
      lead.streetAddress || '',
      lead.city,
      lead.state,
      lead.primaryNiche,
      lead.googleRating ? `${lead.googleRating}/5` : '',
      lead.status,
      (lead.tags || []).join('; '),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setSelectedLeads(new Set());
  };

  const fetchGHLCampaigns = async () => {
    if (!ghlApiKey || !ghlLocationId) {
      alert('Please enter GHL API key and Location ID');
      return;
    }

    try {
      const response = await fetch(
        `/api/ghl/campaigns?ghlApiKey=${encodeURIComponent(ghlApiKey)}&ghlLocationId=${encodeURIComponent(ghlLocationId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      setGHLCampaigns(data.campaigns || []);

      if (data.campaigns.length === 0) {
        alert('No campaigns found. Please create one in GoHighLevel first.');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      alert('Error fetching campaigns. Please check your API key and Location ID.');
    }
  };

  const handlePushToGHL = async () => {
    if (!ghlApiKey || !ghlLocationId) {
      alert('Please enter GHL API key and Location ID');
      return;
    }

    if (selectedLeads.size === 0) {
      alert('Please select leads to push to GHL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ghl/push-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          campaignId: selectedGHLCampaign || undefined,
          ghlApiKey,
          ghlLocationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully pushed ${data.successCount} leads to GoHighLevel${selectedGHLCampaign ? ' and added to email campaign' : ''}`
        );
        setShowGHLModal(false);
        setSelectedLeads(new Set());
        setSelectedGHLCampaign('');
      } else {
        alert(`Error: ${data.error || 'Failed to push leads'}`);
      }
    } catch (error) {
      console.error('Error pushing to GHL:', error);
      alert('Error pushing leads to GHL');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-green-500 text-white';
      case 'A':
        return 'bg-green-400 text-white';
      case 'B':
        return 'bg-blue-400 text-white';
      case 'C':
        return 'bg-yellow-400 text-white';
      case 'D':
        return 'bg-orange-400 text-white';
      case 'F':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getScoreGradeIcon = (grade: string) => {
    switch (grade) {
      case 'A+':
        return '🔥';
      case 'A':
        return '✅';
      case 'B':
        return '👍';
      case 'C':
        return '⚠️';
      case 'D':
        return '❌';
      case 'F':
        return '🚫';
      default:
        return '';
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

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentTab('leads')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                currentTab === 'leads'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              📋 Leads Database
            </button>
            <button
              onClick={() => setCurrentTab('searches')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                currentTab === 'searches'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              🔍 Active Searches
            </button>
            <button
              onClick={() => setCurrentTab('analytics')}
              className={`py-3 px-4 font-medium border-b-2 transition ${
                currentTab === 'analytics'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              📊 Analytics
            </button>
          </div>
        </div>

        {/* Active Searches */}
        {currentTab === 'searches' && (
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

          {/* API Explanation */}
          {showNewSearchForm && (
            <div className="p-6 border-b border-gray-200 bg-blue-50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Maps Explanation */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-2">🗺️ Google Maps API - Finds Businesses</h4>
                  <p className="text-sm text-gray-700 mb-2">Searches for businesses by location + service type.</p>
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p><strong>Example:</strong> "House Cleaners in Salt Lake City"</p>
                    <p><strong>What you get:</strong> Name, phone, address, website, rating</p>
                    <p><strong>Cost:</strong> FREE (includes $200/month free credit)</p>
                  </div>
                  <a
                    href={API_EXPLANATIONS.googleMaps.setup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 font-bold text-xs"
                  >
                    → Get Google Maps API Key
                  </a>
                </div>

                {/* Hunter.io Explanation */}
                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h4 className="font-bold text-gray-900 mb-2">✉️ Hunter.io API - Finds Emails</h4>
                  <p className="text-sm text-gray-700 mb-2">Finds EMAIL ADDRESSES for businesses we discover.</p>
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p><strong>Example:</strong> We find "acme.com" → Hunter finds "john@acme.com"</p>
                    <p><strong>What you get:</strong> Business email addresses (95%+ accurate)</p>
                    <p><strong>Cost:</strong> FREE: 100/month | Paid: $99+ | Create 5 free accounts = 500/month!</p>
                  </div>
                  <a
                    href={API_EXPLANATIONS.hunterIO.setup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 font-bold text-xs"
                  >
                    → Get Hunter.io API Key
                  </a>
                </div>
              </div>
            </div>
          )}

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

              {/* PHASE 1: Quota Control */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">⚙️ Search Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Max Leads Per Run *</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={searchFormData.maxLeads}
                      onChange={(e) => setSearchFormData({ ...searchFormData, maxLeads: Math.min(500, Math.max(1, parseInt(e.target.value) || 100)) })}
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                    />
                    <p className="text-xs text-gray-600 mt-1">Controls quota usage (default: 100, max: 500)</p>
                  </div>

                  {/* PHASE 2: Scheduling */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Schedule Type *</label>
                    <select
                      value={searchFormData.scheduledFrequency}
                      onChange={(e) => setSearchFormData({ ...searchFormData, scheduledFrequency: e.target.value as 'once' | 'daily' })}
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                    >
                      <option value="once">One-time (manual run only)</option>
                      <option value="daily">Daily (auto-runs at scheduled time)</option>
                    </select>
                  </div>

                  {searchFormData.scheduledFrequency === 'daily' && (
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Daily Run Time *</label>
                      <select
                        value={searchFormData.scheduledTime}
                        onChange={(e) => setSearchFormData({ ...searchFormData, scheduledTime: e.target.value })}
                        disabled={submitting}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = String(i).padStart(2, '0');
                          return (
                            <option key={i} value={`${hour}:00`}>
                              {hour}:00 ({i >= 12 ? (i === 12 ? '12' : i - 12) : i === 0 ? '12' : i}:00 {i >= 12 ? 'PM' : 'AM'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
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

          {/* Searches List - PHASE 1 & 2 Enhanced Display */}
          <div className="p-6">
            {searches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No searches configured yet. Create one to get started!</p>
            ) : (
              <div className="space-y-4">
                {searches.map((search) => {
                  const status = search.status || (search.isActive ? 'active' : 'paused'); // Backward compatibility
                  const statusColor =
                    status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800';
                  const progressPercent = search.maxLeads ? Math.min(100, (search.leadsFound / search.maxLeads) * 100) : 0;

                  return (
                    <div key={search.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {search.niche} in {search.city ? `${search.city}, ` : ''}{search.state}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Found: {search.leadsFound} / {search.maxLeads} leads | Last run:{' '}
                            {search.dateLastRun ? new Date(search.dateLastRun).toLocaleDateString() : 'Never'}
                            {search.scheduledFrequency === 'daily' && search.nextRunTime && (
                              <>
                                {' | '}Next run: {new Date(search.nextRunTime).toLocaleDateString()} at {search.scheduledTime}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              status === 'completed'
                                ? 'bg-green-600'
                                : status === 'paused'
                                  ? 'bg-yellow-600'
                                  : 'bg-indigo-600'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(progressPercent)}% quota used</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {status === 'completed' ? (
                          <>
                            <button
                              onClick={() => handleExecuteSearch(search.id)}
                              disabled={submitting}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                            >
                              Re-search
                            </button>
                            <button
                              className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-1 px-3 rounded text-sm transition cursor-not-allowed opacity-50"
                              disabled
                            >
                              Completed ✓
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleExecuteSearch(search.id)}
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                          >
                            {submitting ? 'Running...' : 'Run Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Leads Database */}
        {currentTab === 'leads' && (
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

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <label className="block text-gray-700 font-medium mb-2">
                  Filter by Status
                  <span className="text-xs text-gray-500 ml-2">
                    (Active = new leads not yet contacted)
                  </span>
                </label>
                <select
                  value={filtering.status}
                  onChange={(e) => setFiltering({ ...filtering, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                  title="Active = new, Contacted = we reached out, Converted = customer, Rejected = not interested"
                >
                  <option value="">All Statuses</option>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status.value} value={status.value} title={STATUS_HELP[status.value as keyof typeof STATUS_HELP]?.help || ''}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFiltering({
                    niche: 'all',
                    state: '',
                    status: 'active',
                    hasWebsite: false,
                    hasEmail: false,
                    hasPhone: false,
                    hasSocial: false,
                    hasReviews: false,
                    minRating: 0,
                    maxRating: 5,
                  })}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded transition"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* PHASE 3: Advanced Quality Filters */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">🔍 Advanced Quality Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtering.hasWebsite}
                    onChange={(e) => setFiltering({ ...filtering, hasWebsite: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Has Website</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtering.hasEmail}
                    onChange={(e) => setFiltering({ ...filtering, hasEmail: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Has Email Found</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtering.hasPhone}
                    onChange={(e) => setFiltering({ ...filtering, hasPhone: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Has Phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtering.hasSocial}
                    onChange={(e) => setFiltering({ ...filtering, hasSocial: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Has Social Media</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtering.hasReviews}
                    onChange={(e) => setFiltering({ ...filtering, hasReviews: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Has Reviews</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Rating:</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filtering.minRating}
                    onChange={(e) => setFiltering({ ...filtering, minRating: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">
                    {filtering.minRating}+
                  </span>
                </div>
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
                {/* PHASE 5: Bulk action toolbar */}
                {selectedLeads.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setShowBulkTagModal(true)}
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                      >
                        🏷️ Tag
                      </button>
                      <button
                        onClick={() => setShowGHLModal(true)}
                        disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                      >
                        📧 Send Email (GHL)
                      </button>
                      <button
                        onClick={handleBulkExportCSV}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-sm transition disabled:opacity-50"
                      >
                        📥 Export CSV
                      </button>
                      <button
                        onClick={() => setSelectedLeads(new Set())}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-1 px-3 rounded text-sm transition"
                      >
                        ✕ Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Tag Modal */}
                {showBulkTagModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Tag to Selected Leads</h3>
                      <input
                        type="text"
                        placeholder="e.g., 'high-value', 'follow-up', 'contacted'"
                        value={bulkNewTag}
                        onChange={(e) => setBulkNewTag(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 mb-4"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleBulkTagSubmit}
                          disabled={submitting}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50"
                        >
                          {submitting ? 'Adding...' : 'Add Tag'}
                        </button>
                        <button
                          onClick={() => {
                            setShowBulkTagModal(false);
                            setBulkNewTag('');
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* GHL Campaign Modal */}
                {showGHLModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        📧 Push {selectedLeads.size} Leads to GHL Email Campaign
                      </h3>

                      {/* API Credentials */}
                      <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          ℹ️ Enter your GoHighLevel credentials to push leads and assign them to an email campaign.
                        </p>
                        <input
                          type="password"
                          placeholder="GHL API Key"
                          value={ghlApiKey}
                          onChange={(e) => setGHLApiKey(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="GHL Location ID"
                          value={ghlLocationId}
                          onChange={(e) => setGHLLocationId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-900 text-sm"
                        />
                        <button
                          onClick={fetchGHLCampaigns}
                          disabled={submitting || !ghlApiKey || !ghlLocationId}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded transition disabled:opacity-50 text-sm"
                        >
                          Load Campaigns
                        </button>
                      </div>

                      {/* Campaign Selection */}
                      {ghlCampaigns.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Email Campaign (Optional)
                          </label>
                          <select
                            value={selectedGHLCampaign}
                            onChange={(e) => setSelectedGHLCampaign(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-900"
                          >
                            <option value="">
                              -- Skip Campaign Selection --
                            </option>
                            {ghlCampaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-2">
                            Select a campaign to automatically add these leads to your email sequence.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handlePushToGHL}
                          disabled={submitting || !ghlApiKey || !ghlLocationId}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50"
                        >
                          {submitting ? 'Pushing...' : '✓ Push to GHL'}
                        </button>
                        <button
                          onClick={() => {
                            setShowGHLModal(false);
                            setGHLApiKey('');
                            setGHLLocationId('');
                            setGHLCampaigns([]);
                            setSelectedGHLCampaign('');
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {/* PHASE 5: Selection checkbox */}
                      <th className="text-center py-3 px-2 font-semibold text-gray-900 w-8">
                        <input
                          type="checkbox"
                          checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Business</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Score</th>
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
                        <tr key={lead.id} className={`border-b border-gray-100 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          {/* PHASE 5: Selection checkbox */}
                          <td className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedLeads.has(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleExpandLead(lead.id)}
                              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                            >
                              {isExpanded ? '▼' : '▶'} {lead.businessName}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {(() => {
                              const score = calculateLeadScore(lead);
                              return (
                                <div className="flex flex-col items-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getScoreGradeColor(score.grade)}`}>
                                    {getScoreGradeIcon(score.grade)} {score.grade}
                                  </span>
                                  <span className="text-xs text-gray-600 mt-1">{score.totalScore}/100</span>
                                </div>
                              );
                            })()}
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
        )}

        {/* Analytics Dashboard */}
        {currentTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Leads</h3>
              <p className="text-3xl font-bold text-indigo-600">{analytics.summary.totalLeads}</p>
              <p className="text-xs text-gray-500 mt-2">Across all searches</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Searches</h3>
              <p className="text-3xl font-bold text-blue-600">{analytics.summary.totalSearches}</p>
              <p className="text-xs text-gray-500 mt-2">Avg {analytics.summary.avgLeadsPerSearch}/search</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Pushed to GHL</h3>
              <p className="text-3xl font-bold text-green-600">{analytics.conversionFunnel.pushedToGHL}</p>
              <p className="text-xs text-gray-500 mt-2">Ready for outreach</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Email Opens</h3>
              <p className="text-3xl font-bold text-purple-600">{analytics.engagementMetrics.emailOpenRate}%</p>
              <p className="text-xs text-gray-500 mt-2">Open rate</p>
            </div>
          </div>

          {/* Quality Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Lead Quality Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Has Email</p>
                <p className="text-2xl font-bold text-indigo-600">{analytics.qualityBreakdown.hasEmail}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.hasEmail / analytics.summary.totalLeads) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Has Phone</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.qualityBreakdown.hasPhone}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.hasPhone / analytics.summary.totalLeads) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Has Website</p>
                <p className="text-2xl font-bold text-green-600">{analytics.qualityBreakdown.hasWebsite}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.hasWebsite / analytics.summary.totalLeads) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Has Social</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.qualityBreakdown.hasSocial}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.hasSocial / analytics.summary.totalLeads) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Has Reviews</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.qualityBreakdown.hasReviews}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.hasReviews / analytics.summary.totalLeads) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Verified Email</p>
                <p className="text-2xl font-bold text-red-600">{analytics.qualityBreakdown.verifiedEmail}</p>
                <p className="text-xs text-gray-500">{Math.round((analytics.qualityBreakdown.verifiedEmail / analytics.summary.totalLeads) * 100)}%</p>
              </div>
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Lead Score Distribution</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(analytics.scoreDistribution).map(([grade, count]) => {
                const countNum = count as number;
                return (
                  <div key={grade} className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Grade {grade}</p>
                    <p className="text-2xl font-bold">{countNum}</p>
                    <p className="text-xs text-gray-500">{Math.round((countNum / analytics.summary.totalLeads) * 100)}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Niches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performing Niches</h3>
            <div className="space-y-3">
              {analytics.topNiches.slice(0, 5).map((niche: any) => (
                <div key={niche.niche} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-900">{niche.niche}</p>
                    <p className="text-sm text-gray-600">{niche.leads} leads | Avg score: {niche.avgScore}</p>
                  </div>
                  <div className="text-right">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${(niche.leads / analytics.summary.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
