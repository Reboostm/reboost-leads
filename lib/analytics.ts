/**
 * Analytics and Metrics Collection
 * Generates insights on lead quality, source performance, and conversion funnels
 */

import { Lead, LeadSearch } from './types/lead';
import { calculateLeadScore } from './scoring';

export interface Analytics {
  summary: {
    totalLeads: number;
    totalSearches: number;
    newLeadsToday: number;
    avgLeadsPerSearch: number;
  };
  byNiche: Array<{
    niche: string;
    leadCount: number;
    avgScore: number;
    topSource: string;
  }>;
  bySource: Array<{
    source: string;
    leadCount: number;
    percentage: number;
  }>;
  qualityBreakdown: {
    hasEmail: number;
    hasPhone: number;
    hasWebsite: number;
    hasSocial: number;
    hasReviews: number;
    verifiedEmail: number;
  };
  scoreDistribution: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
    'D': number;
    'F': number;
  };
  conversionFunnel: {
    found: number; // Total leads found
    enriched: number; // Has email/phone
    pushedToGHL: number; // Pushed to GHL
    engaged: number; // Opened email or clicked
    converted: number; // Status = converted
  };
  engagementMetrics: {
    emailOpenRate: number; // % of pushed leads that opened email
    clickRate: number; // % of pushed leads that clicked
    avgEmailsOpened: number;
    avgEmailsClicked: number;
  };
  sourcePerformance: Array<{
    source: string;
    leads: number;
    avgScore: number;
    verificationRate: number;
  }>;
  topNiches: Array<{
    niche: string;
    leads: number;
    avgScore: number;
  }>;
  locationHotspots: Array<{
    state: string;
    city: string;
    leadCount: number;
  }>;
}

/**
 * Calculate complete analytics from leads and searches
 */
export function generateAnalytics(leads: Lead[], searches: LeadSearch[]): Analytics {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Basic summary
  const totalLeads = leads.length;
  const totalSearches = searches.length;
  const newLeadsToday = leads.filter(
    (l) => new Date(l.dateFound).getTime() >= today.getTime()
  ).length;
  const avgLeadsPerSearch = totalSearches > 0 ? Math.round(totalLeads / totalSearches) : 0;

  // By niche
  const nicheMap = new Map<string, Lead[]>();
  leads.forEach((lead) => {
    const niche = lead.primaryNiche;
    if (!nicheMap.has(niche)) nicheMap.set(niche, []);
    nicheMap.get(niche)!.push(lead);
  });

  const byNiche = Array.from(nicheMap.entries())
    .map(([niche, nichLeads]) => ({
      niche,
      leadCount: nichLeads.length,
      avgScore: Math.round(
        nichLeads.reduce((sum, l) => sum + calculateLeadScore(l).totalScore, 0) /
          nichLeads.length
      ),
      topSource: getTopSource(nichLeads),
    }))
    .sort((a, b) => b.leadCount - a.leadCount);

  // By source
  const sourceMap = new Map<string, number>();
  leads.forEach((lead) => {
    const source = lead.sources?.[0] || 'unknown';
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  const bySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      leadCount: count,
      percentage: Math.round((count / totalLeads) * 100),
    }))
    .sort((a, b) => b.leadCount - a.leadCount);

  // Quality breakdown
  const qualityBreakdown = {
    hasEmail: leads.filter((l) => l.primaryEmail).length,
    hasPhone: leads.filter((l) => l.primaryPhone).length,
    hasWebsite: leads.filter((l) => l.website).length,
    hasSocial: leads.filter((l) =>
      l.linkedinUrl || l.facebookUrl || l.instagramHandle || l.twitterHandle
    ).length,
    hasReviews: leads.filter((l) => l.googleReviewCount && l.googleReviewCount > 0).length,
    verifiedEmail: leads.filter((l) => l.primaryEmail && l.sources?.includes('hunter.io')).length,
  };

  // Score distribution
  const scoreDistribution: Analytics['scoreDistribution'] = {
    'A+': 0,
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'F': 0,
  };

  leads.forEach((lead) => {
    const score = calculateLeadScore(lead);
    scoreDistribution[score.grade]++;
  });

  // Conversion funnel
  const ghlPushedLeads = leads.filter((l) => l.ghlPushed);
  const engagedLeads = leads.filter(
    (l) => l.emailsOpened && l.emailsOpened > 0
  );
  const convertedLeads = leads.filter((l) => l.status === 'converted');

  const conversionFunnel = {
    found: totalLeads,
    enriched: qualityBreakdown.hasEmail,
    pushedToGHL: ghlPushedLeads.length,
    engaged: engagedLeads.length,
    converted: convertedLeads.length,
  };

  // Engagement metrics
  const emailOpenRate = ghlPushedLeads.length > 0
    ? Math.round(
        (engagedLeads.filter((l) => l.ghlPushed).length / ghlPushedLeads.length) * 100
      )
    : 0;

  const clickedLeads = leads.filter((l) => l.emailsClicked && l.emailsClicked > 0);
  const clickRate = ghlPushedLeads.length > 0
    ? Math.round(
        (clickedLeads.filter((l) => l.ghlPushed).length / ghlPushedLeads.length) * 100
      )
    : 0;

  const avgEmailsOpened =
    engagedLeads.length > 0
      ? Math.round(
          engagedLeads.reduce((sum, l) => sum + (l.emailsOpened || 0), 0) /
            engagedLeads.length
        )
      : 0;

  const avgEmailsClicked =
    clickedLeads.length > 0
      ? Math.round(
          clickedLeads.reduce((sum, l) => sum + (l.emailsClicked || 0), 0) /
            clickedLeads.length
        )
      : 0;

  // Source performance
  const sourcePerformance = Array.from(sourceMap.entries())
    .map(([source, count]) => {
      const sourceLeads = leads.filter((l) => l.sources?.[0] === source);
      const verifiedCount = sourceLeads.filter((l) => l.primaryEmail).length;
      return {
        source,
        leads: count,
        avgScore: Math.round(
          sourceLeads.reduce((sum, l) => sum + calculateLeadScore(l).totalScore, 0) /
            sourceLeads.length
        ),
        verificationRate: Math.round((verifiedCount / count) * 100),
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // Top niches
  const topNiches = byNiche.slice(0, 10);

  // Location hotspots
  const locationMap = new Map<string, number>();
  leads.forEach((lead) => {
    const location = `${lead.city}, ${lead.state}`;
    locationMap.set(location, (locationMap.get(location) || 0) + 1);
  });

  const locationHotspots = Array.from(locationMap.entries())
    .map(([location, count]) => {
      const [city, state] = location.split(', ');
      return { state, city, leadCount: count };
    })
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 15);

  return {
    summary: {
      totalLeads,
      totalSearches,
      newLeadsToday,
      avgLeadsPerSearch,
    },
    byNiche,
    bySource,
    qualityBreakdown,
    scoreDistribution,
    conversionFunnel,
    engagementMetrics: {
      emailOpenRate,
      clickRate,
      avgEmailsOpened,
      avgEmailsClicked,
    },
    sourcePerformance,
    topNiches,
    locationHotspots,
  };
}

/**
 * Helper: Get top source for a set of leads
 */
function getTopSource(leads: Lead[]): string {
  const sourceMap = new Map<string, number>();
  leads.forEach((lead) => {
    const source = lead.sources?.[0] || 'unknown';
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });

  let topSource = 'unknown';
  let maxCount = 0;

  sourceMap.forEach((count, source) => {
    if (count > maxCount) {
      maxCount = count;
      topSource = source;
    }
  });

  return topSource;
}
