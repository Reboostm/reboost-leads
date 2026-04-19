/**
 * API Keys Management
 * Save and retrieve API keys from Firestore
 * These persist across all machines
 */

import { db } from './firebase';
import { collection, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

const API_KEYS_COLLECTION = 'api_config';
const CONFIG_DOC_ID = 'keys';

export interface ApiKeysConfig {
  googleMapsApiKey?: string;
  hunterIoApiKey?: string;
  ghlApiKey?: string;
  ghlLocationId?: string;
  cronSecret?: string;
  dateUpdated?: Date;
}

/**
 * Save API keys to Firestore
 * These will be accessible from any machine
 */
export async function saveApiKeys(keys: ApiKeysConfig): Promise<void> {
  try {
    const configRef = doc(db, API_KEYS_COLLECTION, CONFIG_DOC_ID);

    // Filter out undefined values - Firestore doesn't accept them
    const dataToSave: any = {};
    Object.keys(keys).forEach((key) => {
      const value = keys[key as keyof ApiKeysConfig];
      if (value !== undefined) {
        dataToSave[key] = value;
      }
    });

    await setDoc(configRef, {
      ...dataToSave,
      dateUpdated: Timestamp.now(),
    }, { merge: true });

    console.log('[API KEYS] Saved to database');
  } catch (error) {
    console.error('[API KEYS] Error saving:', error);
    throw error;
  }
}

/**
 * Get API keys from Firestore
 * These load on any machine
 */
export async function getApiKeys(): Promise<ApiKeysConfig | null> {
  try {
    const configRef = doc(db, API_KEYS_COLLECTION, CONFIG_DOC_ID);
    const snapshot = await getDoc(configRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        googleMapsApiKey: data.googleMapsApiKey,
        hunterIoApiKey: data.hunterIoApiKey,
        ghlApiKey: data.ghlApiKey,
        ghlLocationId: data.ghlLocationId,
        cronSecret: data.cronSecret,
        dateUpdated: data.dateUpdated?.toDate?.() || new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error('[API KEYS] Error loading:', error);
    return null;
  }
}

/**
 * Update a single API key
 */
export async function updateApiKey(keyName: keyof ApiKeysConfig, value: string): Promise<void> {
  try {
    const configRef = doc(db, API_KEYS_COLLECTION, CONFIG_DOC_ID);

    await setDoc(configRef, {
      [keyName]: value,
      dateUpdated: Timestamp.now(),
    }, { merge: true });

    console.log(`[API KEYS] Updated ${keyName}`);
  } catch (error) {
    console.error(`[API KEYS] Error updating ${keyName}:`, error);
    throw error;
  }
}

/**
 * Delete a specific API key
 */
export async function deleteApiKey(keyName: keyof ApiKeysConfig): Promise<void> {
  try {
    const configRef = doc(db, API_KEYS_COLLECTION, CONFIG_DOC_ID);

    await setDoc(configRef, {
      [keyName]: null,
      dateUpdated: Timestamp.now(),
    }, { merge: true });

    console.log(`[API KEYS] Deleted ${keyName}`);
  } catch (error) {
    console.error(`[API KEYS] Error deleting ${keyName}:`, error);
    throw error;
  }
}
