/**
 * Lead Search Scheduler
 * Manages daily recurring searches and quota tracking
 * PHASE 2 Implementation
 */

import { getLeadSearches, getSearchesByStatus, updateLeadSearch } from './leads';
import { LeadSearch } from './types/lead';

/**
 * Check if a search should run today based on schedule
 */
export function shouldRunSearch(search: LeadSearch, currentDate: Date = new Date()): boolean {
  // Must be active or scheduled daily
  if (search.status !== 'active' && search.scheduledFrequency !== 'daily') {
    return false;
  }

  // If it's a one-time search, don't reschedule
  if (search.scheduledFrequency === 'once' && search.dateLastRun) {
    return false;
  }

  // If daily scheduled, check if it's the right time
  if (search.scheduledFrequency === 'daily' && search.scheduledTime) {
    const scheduledHour = parseInt(search.scheduledTime.split(':')[0], 10);
    const currentHour = currentDate.getHours();

    // Run during the scheduled hour
    return currentHour === scheduledHour;
  }

  return true;
}

/**
 * Get the next run time for a search
 * Returns Date when search should run next, or null if completed
 */
export function getNextRunTime(search: LeadSearch, currentDate: Date = new Date()): Date | null {
  // Don't schedule if completed
  if (search.status === 'completed') {
    return null;
  }

  // If not daily, no next run
  if (search.scheduledFrequency !== 'daily' || !search.scheduledTime) {
    return null;
  }

  const [hours] = search.scheduledTime.split(':').map(Number);
  const nextRun = new Date(currentDate);
  nextRun.setHours(hours, 0, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (nextRun <= currentDate) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

/**
 * Initialize daily scheduler
 * Call this during app startup to load all scheduled searches
 */
export async function initializeDailyScheduler(): Promise<void> {
  try {
    const activeSearches = await getSearchesByStatus('active');

    // Initialize each search with next run time if scheduled daily
    for (const search of activeSearches) {
      if (search.scheduledFrequency === 'daily' && search.scheduledTime) {
        const nextRunTime = getNextRunTime(search);
        if (nextRunTime) {
          await updateLeadSearch(search.id, {
            nextRunTime,
          });
        }
      }
    }

    console.log(`[Scheduler] Initialized ${activeSearches.length} searches`);
  } catch (error) {
    console.error('[Scheduler] Failed to initialize:', error);
  }
}

/**
 * Get all searches that should run right now
 * Called by /api/scheduler/run endpoint
 */
export async function getScheduledSearchesToRun(): Promise<LeadSearch[]> {
  try {
    const activeSearches = await getSearchesByStatus('active');
    const now = new Date();
    const searchesToRun: LeadSearch[] = [];

    for (const search of activeSearches) {
      if (shouldRunSearch(search, now)) {
        searchesToRun.push(search);
      }
    }

    return searchesToRun;
  } catch (error) {
    console.error('[Scheduler] Failed to get scheduled searches:', error);
    return [];
  }
}

/**
 * Record a search execution in the scheduler
 * Updates last run time and checks if quota is reached
 */
export async function recordSearchExecution(
  searchId: string,
  leadsFound: number,
  newLeads: number
): Promise<void> {
  try {
    const updates: Partial<LeadSearch> = {
      dateLastRun: new Date(),
      leadsFound,
      newLeadsToday: newLeads,
    };

    // Check if we've reached the max leads quota
    const searches = await getLeadSearches();
    const search = searches.find((s) => s.id === searchId);

    if (search && leadsFound >= search.maxLeads) {
      updates.status = 'completed';
      updates.completedDate = new Date();
    }

    // Update next run time if daily
    if (search?.scheduledFrequency === 'daily') {
      const nextRunTime = getNextRunTime(search);
      if (nextRunTime) {
        updates.nextRunTime = nextRunTime;
      }
    }

    await updateLeadSearch(searchId, updates);
  } catch (error) {
    console.error(`[Scheduler] Failed to record execution for search ${searchId}:`, error);
  }
}
