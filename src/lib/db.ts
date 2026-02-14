/**
 * IndexedDB Utility for caching simulation results
 */
import type { SerializableSimulationConfig, SerializableSimulationResult } from './worker-types';

const DB_NAME = 'DemivioCache';
const STORE_NAME = 'simulations';
const DB_VERSION = 3; // Bumped to force cache clear due to schema change (score -> humanScore)

export interface CachedSimulation {
  id: string; // Hash of config
  config: SerializableSimulationConfig;
  results: SerializableSimulationResult[];
  timestamp: number;
}

/**
 * Generate a simple hash for the config to use as an ID
 */
export function hashConfig(config: SerializableSimulationConfig): string {
  return JSON.stringify({
    ref: config.referenceTransaction,
    target: config.targetPpn,
    tol: config.tolerance,
    pMin: config.priceMin,
    pMax: config.priceMax,
    dMin: config.discountMin,
    dMax: config.discountMax,
    qMin: config.quantityMin,
    qMax: config.quantityMax,
    qStep: config.quantityStep,
    pStep: config.priceStep,
    dStep: config.discountStep,
    a: config.alpha,
    b: config.beta,
    n: config.topNResults
  });
}

/**
 * Open the database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Clear old store if it exists (schema change or version bump)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      
      // Create new store
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
}

/**
 * Save simulation to cache
 */
export async function saveToCache(config: SerializableSimulationConfig, results: SerializableSimulationResult[]): Promise<void> {
  try {
    const db = await openDB();
    const id = hashConfig(config);
    const entry: CachedSimulation = {
      id,
      config,
      results,
      timestamp: Date.now()
    };
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save to cache:', e);
  }
}

/**
 * Get simulation from cache
 */
export async function getFromCache(config: SerializableSimulationConfig): Promise<SerializableSimulationResult[] | null> {
  try {
    const db = await openDB();
    const id = hashConfig(config);
    
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entry = request.result as CachedSimulation | undefined;
        resolve(entry ? entry.results : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get from cache:', e);
    return null;
  }
}

/**
 * Clear old cache entries (Optional)
 */
export async function clearOldCache(maxAgeDays = 7): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (now - cursor.value.timestamp > maxAge) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (e) {
    console.error('Failed to clear old cache:', e);
  }
}
