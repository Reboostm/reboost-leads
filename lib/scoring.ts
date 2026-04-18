/**
 * Lead Scoring System
 * Automatically rates lead quality based on data completeness and engagement
 */

import { Lead } from './types/lead';

export interface LeadScore {
  totalScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'; // Letter grade
  breakdown: {
    contactInfo: number; // Has email, phone
    verification: number; // Email verified
    reputation: number; // Reviews, rating
    engagement: number; // Email opens/clicks, GHL interaction
    enrichment: number; // Website, social media
  };
  recommendation: string;
}

/**
 * Calculate lead score (0-100)
 * Factors:
 * - Contact Info (20 pts): Email (10) + Phone (10)
 * - Verification (20 pts): Verified email (20)
 * - Reputation (20 pts): Rating 4+ (10) + Has reviews (10)
 * - Engagement (20 pts): GHL opens (10) + clicks (10)
 * - Enrichment (20 pts): Website (10) + Social (10)
 */
export function calculateLeadScore(lead: Lead): LeadScore {
  let scores = {
    contactInfo: 0,
    verification: 0,
    reputation: 0,
    engagement: 0,
    enrichment: 0,
  };

  // Contact Info (0-20)
  if (lead.primaryEmail) scores.contactInfo += 10;
  if (lead.primaryPhone) scores.contactInfo += 10;

  // Verification (0-20)
  // Note: You'd need to implement email verification integration
  // For now, we'll assume verified if from Hunter.io
  if (lead.primaryEmail && lead.sources?.includes('hunter.io')) {
    scores.verification += 20;
  }

  // Reputation (0-20)
  if (lead.googleRating && lead.googleRating >= 4) {
    scores.reputation += 10;
  }
  if (lead.googleReviewCount && lead.googleReviewCount > 0) {
    scores.reputation += 10;
  }

  // Engagement (0-20)
  if (lead.emailsOpened && lead.emailsOpened > 0) {
    scores.engagement += Math.min(10, lead.emailsOpened * 2); // Max 10 pts
  }
  if (lead.emailsClicked && lead.emailsClicked > 0) {
    scores.engagement += Math.min(10, lead.emailsClicked * 3); // Max 10 pts
  }

  // Enrichment (0-20)
  if (lead.website) scores.enrichment += 10;
  if (lead.linkedinUrl || lead.facebookUrl || lead.instagramHandle || lead.twitterHandle) {
    scores.enrichment += 10;
  }

  // Calculate total
  const totalScore = Math.min(
    100,
    Object.values(scores).reduce((sum, val) => sum + val, 0)
  );

  // Determine grade
  let grade: LeadScore['grade'];
  if (totalScore >= 95) grade = 'A+';
  else if (totalScore >= 85) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 55) grade = 'C';
  else if (totalScore >= 40) grade = 'D';
  else grade = 'F';

  // Generate recommendation
  let recommendation = '';
  if (grade === 'A+' || grade === 'A') {
    recommendation = '🔥 Priority lead - high quality, ready to contact';
  } else if (grade === 'B') {
    recommendation = '✅ Good lead - email + social ready';
  } else if (grade === 'C') {
    recommendation = '⚠️ Need enrichment - missing contact info';
  } else {
    recommendation = '❌ Poor fit - lacks essential data';
  }

  return {
    totalScore,
    grade,
    breakdown: scores,
    recommendation,
  };
}

/**
 * Update lead score in database
 * Call this when lead data changes or engagement updates
 */
export async function updateLeadScore(leadId: string, lead: Lead): Promise<void> {
  const score = calculateLeadScore(lead);

  // Would update in Firestore with: score.totalScore, score.grade
  // For now, this is calculated on-the-fly in the UI
  console.log(`[SCORING] Lead ${leadId}: ${score.grade} (${score.totalScore}/100) - ${score.recommendation}`);
}

/**
 * Get leads ranked by score
 * Returns leads sorted by quality (highest score first)
 */
export function rankLeadsByScore(leads: Lead[]): Array<Lead & { score: LeadScore }> {
  return leads
    .map((lead) => ({
      ...lead,
      score: calculateLeadScore(lead),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}

/**
 * Filter leads by score grade
 */
export function filterLeadsByGrade(
  leads: Lead[],
  grades: LeadScore['grade'][]
): Lead[] {
  return leads.filter((lead) => {
    const score = calculateLeadScore(lead);
    return grades.includes(score.grade);
  });
}

/**
 * Get score statistics for a set of leads
 */
export function getScoreStats(leads: Lead[]): {
  averageScore: number;
  medianScore: number;
  topGrade: LeadScore['grade'];
  gradeDistribution: Record<LeadScore['grade'], number>;
} {
  const scores = leads.map((lead) => calculateLeadScore(lead).totalScore);
  const grades = leads.map((lead) => calculateLeadScore(lead).grade);

  // Average
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Median
  const sorted = [...scores].sort((a, b) => a - b);
  const medianScore = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Grade distribution
  const gradeDistribution: Record<LeadScore['grade'], number> = {
    'A+': 0,
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'F': 0,
  };

  grades.forEach((grade) => {
    gradeDistribution[grade]++;
  });

  // Top grade
  const gradeList: LeadScore['grade'][] = ['A+', 'A', 'B', 'C', 'D', 'F'];
  const topGrade = gradeList.find((g) => gradeDistribution[g] > 0) || 'F';

  return {
    averageScore: Math.round(averageScore),
    medianScore: Math.round(medianScore),
    topGrade,
    gradeDistribution,
  };
}
