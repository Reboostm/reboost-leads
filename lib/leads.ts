/**
 * Lead Database Operations
 * CRUD operations for leads in Firestore
 */

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { Lead, LeadSearch, DailyImportMetrics, Activity } from './types/lead';
import { generateFingerprint, normalizeEmail, normalizePhone } from './deduplication';

const LEADS_COLLECTION = 'leads';
const SEARCHES_COLLECTION = 'lead_searches';
const METRICS_COLLECTION = 'import_metrics';
const ACTIVITIES_COLLECTION = 'lead_activities';

/**
 * Check if a lead already exists (deduplication check)
 */
export async function checkLeadExists(
  businessName: string,
  city: string,
  state: string,
  phone?: string,
  email?: string
): Promise<{ exists: boolean; leadId?: string }> {
  const fingerprint = generateFingerprint(businessName, city, state, phone, email);

  // Check by fingerprint first
  const fingerprintQuery = query(
    collection(db, LEADS_COLLECTION),
    where('fingerprint', '==', fingerprint)
  );
  const fingerprintResults = await getDocs(fingerprintQuery);

  if (!fingerprintResults.empty) {
    return { exists: true, leadId: fingerprintResults.docs[0].id };
  }

  // Check by email if provided
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    const emailQuery = query(
      collection(db, LEADS_COLLECTION),
      where('primaryEmail', '==', normalizedEmail)
    );
    const emailResults = await getDocs(emailQuery);

    if (!emailResults.empty) {
      return { exists: true, leadId: emailResults.docs[0].id };
    }
  }

  // Check by phone if provided
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const phoneQuery = query(
      collection(db, LEADS_COLLECTION),
      where('primaryPhone', '==', normalizedPhone)
    );
    const phoneResults = await getDocs(phoneQuery);

    if (!phoneResults.empty) {
      return { exists: true, leadId: phoneResults.docs[0].id };
    }
  }

  return { exists: false };
}

/**
 * Create a new lead
 */
export async function createLead(lead: Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated'>): Promise<string> {
  // Generate fingerprint if not provided
  const fingerprint =
    lead.fingerprint ||
    generateFingerprint(lead.businessName, lead.city, lead.state, lead.primaryPhone, lead.primaryEmail);

  const leadData = {
    ...lead,
    fingerprint,
    dateFound: Timestamp.now(),
    dateLastUpdated: Timestamp.now(),
    sources: lead.sources || [],
    status: lead.status || 'active',
    tags: lead.tags || [], // PHASE 5: Initialize empty tags
    ghlPushed: lead.ghlPushed || false, // PHASE 4: Initialize as not pushed
  };

  const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadData);
  return docRef.id;
}

/**
 * Get lead by ID
 */
export async function getLead(leadId: string): Promise<Lead | null> {
  const docRef = doc(db, LEADS_COLLECTION, leadId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as Lead;
}

/**
 * Get all leads with optional filtering
 */
export async function getLeads(filters?: {
  niche?: string;
  state?: string;
  city?: string;
  status?: string;
  limit?: number;
}): Promise<Lead[]> {
  const constraints: QueryConstraint[] = [];

  if (filters?.niche) {
    constraints.push(where('primaryNiche', '==', filters.niche));
  }
  if (filters?.state) {
    constraints.push(where('state', '==', filters.state));
  }
  if (filters?.city) {
    constraints.push(where('city', '==', filters.city));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const q = constraints.length > 0 ? query(collection(db, LEADS_COLLECTION), ...constraints) : query(collection(db, LEADS_COLLECTION));

  const querySnapshot = await getDocs(q);
  const leads: Lead[] = [];

  querySnapshot.forEach((doc) => {
    leads.push(doc.data() as Lead);
  });

  return filters?.limit ? leads.slice(0, filters.limit) : leads;
}

/**
 * Get leads count for a specific niche/state
 */
export async function getLeadsCount(niche: string, state: string, city?: string): Promise<number> {
  const constraints: QueryConstraint[] = [
    where('primaryNiche', '==', niche),
    where('state', '==', state),
  ];

  if (city) {
    constraints.push(where('city', '==', city));
  }

  const q = query(collection(db, LEADS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.size;
}

/**
 * Update a lead
 */
export async function updateLead(leadId: string, updates: Partial<Lead>): Promise<void> {
  const docRef = doc(db, LEADS_COLLECTION, leadId);
  await updateDoc(docRef, {
    ...updates,
    dateLastUpdated: Timestamp.now(),
  });
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  const docRef = doc(db, LEADS_COLLECTION, leadId);
  await deleteDoc(docRef);
}

/**
 * Batch create leads with deduplication
 * Returns: { created, duplicates, failed }
 */
export async function batchCreateLeads(
  leadsToCreate: Omit<Lead, 'id' | 'dateFound' | 'dateLastUpdated' | 'fingerprint'>[]
): Promise<{
  created: number;
  duplicates: number;
  failed: number;
  newLeads: string[];
}> {
  const batch = writeBatch(db);
  const newLeadIds: string[] = [];
  let duplicateCount = 0;
  let failedCount = 0;

  for (const lead of leadsToCreate) {
    try {
      const { exists } = await checkLeadExists(
        lead.businessName,
        lead.city,
        lead.state,
        lead.primaryPhone,
        lead.primaryEmail
      );

      if (exists) {
        duplicateCount++;
        continue;
      }

      const fingerprint = generateFingerprint(
        lead.businessName,
        lead.city,
        lead.state,
        lead.primaryPhone,
        lead.primaryEmail
      );

      const leadRef = doc(collection(db, LEADS_COLLECTION));
      batch.set(leadRef, {
        ...lead,
        fingerprint,
        dateFound: Timestamp.now(),
        dateLastUpdated: Timestamp.now(),
        sources: lead.sources || [],
        status: lead.status || 'active',
        tags: lead.tags || [], // PHASE 5: Initialize empty tags
        ghlPushed: lead.ghlPushed || false, // PHASE 4: Initialize as not pushed
      });

      newLeadIds.push(leadRef.id);
    } catch (error) {
      failedCount++;
      console.error(`Failed to process lead: ${lead.businessName}`, error);
    }
  }

  await batch.commit();

  return {
    created: newLeadIds.length,
    duplicates: duplicateCount,
    failed: failedCount,
    newLeads: newLeadIds,
  };
}

/**
 * Create or update a search configuration
 */
export async function saveLeadSearch(search: Omit<LeadSearch, 'id'>): Promise<string> {
  // Filter out undefined values - Firestore doesn't accept them
  const dataToSave: any = {};
  Object.keys(search).forEach((key) => {
    const value = search[key as keyof Omit<LeadSearch, 'id'>];
    if (value !== undefined) {
      dataToSave[key] = value;
    }
  });

  const searchData = {
    ...dataToSave,
    dateCreated: search.dateCreated || Timestamp.now(),
    dateLastRun: search.dateLastRun ? Timestamp.fromDate(search.dateLastRun) : null,
  };

  const docRef = await addDoc(collection(db, SEARCHES_COLLECTION), searchData);
  return docRef.id;
}

/**
 * Get all lead searches
 */
export async function getLeadSearches(): Promise<LeadSearch[]> {
  const querySnapshot = await getDocs(collection(db, SEARCHES_COLLECTION));
  const searches: LeadSearch[] = [];

  querySnapshot.forEach((doc) => {
    searches.push({ id: doc.id, ...(doc.data() as Omit<LeadSearch, 'id'>) });
  });

  return searches;
}

/**
 * Update search configuration
 */
export async function updateLeadSearch(searchId: string, updates: Partial<LeadSearch>): Promise<void> {
  const docRef = doc(db, SEARCHES_COLLECTION, searchId);
  await updateDoc(docRef, updates);
}

/**
 * Log daily import metrics
 */
export async function logImportMetrics(metrics: Omit<DailyImportMetrics, 'id' | 'date'>): Promise<string> {
  const metricsData = {
    ...metrics,
    date: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, METRICS_COLLECTION), metricsData);
  return docRef.id;
}

/**
 * Get import metrics for the last N days
 */
export async function getImportMetrics(days: number = 7): Promise<DailyImportMetrics[]> {
  const querySnapshot = await getDocs(collection(db, METRICS_COLLECTION));
  const metrics: DailyImportMetrics[] = [];

  querySnapshot.forEach((doc) => {
    metrics.push({ id: doc.id, ...(doc.data() as Omit<DailyImportMetrics, 'id'>) });
  });

  // Sort by date descending and filter to last N days
  return metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, days);
}

/**
 * PHASE 1 & 5: Update lead tags
 * Add or replace tags on a single lead
 */
export async function updateLeadTags(leadId: string, tags: string[]): Promise<void> {
  const docRef = doc(db, LEADS_COLLECTION, leadId);
  await updateDoc(docRef, {
    tags,
    dateLastUpdated: Timestamp.now(),
  });
}

/**
 * PHASE 5: Bulk update lead status
 * Change status on multiple leads at once
 */
export async function updateLeadsStatus(
  leadIds: string[],
  status: 'active' | 'contacted' | 'converted' | 'rejected' | 'archived' | 'deleted'
): Promise<void> {
  const batch = writeBatch(db);

  for (const leadId of leadIds) {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    batch.update(docRef, {
      status,
      dateLastUpdated: Timestamp.now(),
    });
  }

  await batch.commit();
}

/**
 * PHASE 1: Get searches by status
 * Find all searches with a specific status
 */
export async function getSearchesByStatus(
  status: 'active' | 'paused' | 'completed'
): Promise<LeadSearch[]> {
  const q = query(collection(db, SEARCHES_COLLECTION), where('status', '==', status));
  const querySnapshot = await getDocs(q);
  const searches: LeadSearch[] = [];

  querySnapshot.forEach((doc) => {
    searches.push({ id: doc.id, ...(doc.data() as Omit<LeadSearch, 'id'>) });
  });

  return searches;
}

/**
 * PHASE 1: Mark search as completed
 * When max leads quota is reached, mark the search as complete
 */
export async function markSearchCompleted(searchId: string, totalFound: number): Promise<void> {
  const docRef = doc(db, SEARCHES_COLLECTION, searchId);
  await updateDoc(docRef, {
    status: 'completed',
    completedDate: Timestamp.now(),
    leadsFound: totalFound,
  });
}

/**
 * Activity Logging Functions
 * Track all interactions with leads for audit trail and analytics
 */

/**
 * Log an activity for a lead
 */
export async function logActivity(
  leadId: string,
  type: Activity['type'],
  description: string,
  metadata?: Record<string, any>
): Promise<string> {
  const activity: Omit<Activity, 'id'> = {
    leadId,
    type,
    description,
    metadata,
    timestamp: new Date(),
  };

  const docRef = await addDoc(collection(db, ACTIVITIES_COLLECTION), activity);
  return docRef.id;
}

/**
 * Get activity log for a specific lead
 */
export async function getLeadActivities(leadId: string): Promise<Activity[]> {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('leadId', '==', leadId)
  );
  const querySnapshot = await getDocs(q);
  const activities: Activity[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    activities.push({
      id: doc.id,
      ...(data as Omit<Activity, 'id'>),
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
    });
  });

  // Sort by timestamp descending (newest first)
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get recent activities across all leads
 */
export async function getRecentActivities(limit: number = 50): Promise<Activity[]> {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION)
  );
  const querySnapshot = await getDocs(q);
  const activities: Activity[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    activities.push({
      id: doc.id,
      ...(data as Omit<Activity, 'id'>),
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
    });
  });

  // Sort by timestamp descending and limit
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(leadId: string): Promise<Lead | null> {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...(data as Omit<Lead, 'id'>),
      dateFound: data.dateFound instanceof Timestamp ? data.dateFound.toDate() : new Date(data.dateFound),
      dateLastUpdated: data.dateLastUpdated instanceof Timestamp ? data.dateLastUpdated.toDate() : new Date(data.dateLastUpdated),
      dateGhlPushed: data.dateGhlPushed instanceof Timestamp ? data.dateGhlPushed.toDate() : data.dateGhlPushed ? new Date(data.dateGhlPushed) : undefined,
      lastEmailOpenDate: data.lastEmailOpenDate instanceof Timestamp ? data.lastEmailOpenDate.toDate() : data.lastEmailOpenDate ? new Date(data.lastEmailOpenDate) : undefined,
      lastContactAttempt: data.lastContactAttempt instanceof Timestamp ? data.lastContactAttempt.toDate() : data.lastContactAttempt ? new Date(data.lastContactAttempt) : undefined,
    };
  } catch (error) {
    console.error('[LEADS] Error getting lead by ID:', error);
    return null;
  }
}

/**
 * Update specific fields on a lead
 */
export async function updateLeadData(leadId: string, updates: Partial<Lead>): Promise<void> {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);

    // Convert Date objects to Firestore Timestamps
    const dataToUpdate: any = { ...updates };
    if (updates.dateLastUpdated) {
      dataToUpdate.dateLastUpdated = Timestamp.fromDate(updates.dateLastUpdated as Date);
    }
    if (updates.dateGhlPushed instanceof Date) {
      dataToUpdate.dateGhlPushed = Timestamp.fromDate(updates.dateGhlPushed);
    }
    if (updates.lastEmailOpenDate instanceof Date) {
      dataToUpdate.lastEmailOpenDate = Timestamp.fromDate(updates.lastEmailOpenDate);
    }
    if (updates.lastContactAttempt instanceof Date) {
      dataToUpdate.lastContactAttempt = Timestamp.fromDate(updates.lastContactAttempt);
    }

    // Add update timestamp
    if (!dataToUpdate.dateLastUpdated) {
      dataToUpdate.dateLastUpdated = Timestamp.now();
    }

    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error('[LEADS] Error updating lead:', error);
    throw error;
  }
}
