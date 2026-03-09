// Offline-First Event Queue with IndexedDB
// Ensures no tracking data is lost even when network is unavailable

const DB_NAME = 'tracking_queue';
const STORE_NAME = 'events';
const DB_VERSION = 1;
const MAX_QUEUE_SIZE = 500;
const RETRY_INTERVAL = 30_000;

let db: IDBDatabase | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('retries', 'retries', { unique: false });
      }
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onerror = () => reject(request.error);
  });
};

// Add event to offline queue
export const queueEvent = async (event: Record<string, any>) => {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Check queue size
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result >= MAX_QUEUE_SIZE) {
        // Remove oldest events
        const cursorReq = store.openCursor();
        let deleted = 0;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && deleted < 50) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };

    store.add({
      event,
      timestamp: Date.now(),
      retries: 0,
    });
  } catch (e) {
    console.debug('Failed to queue event:', e);
  }
};

// Get pending events from queue
const getPendingEvents = async (limit: number = 50): Promise<Array<{ id: number; event: any; retries: number }>> => {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const events: any[] = [];
      
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && events.length < limit) {
          const record = cursor.value;
          if (record.retries < 5) {
            events.push({ id: record.id ?? cursor.key, event: record.event, retries: record.retries });
          }
          cursor.continue();
        } else {
          resolve(events);
        }
      };
      cursorReq.onerror = () => resolve([]);
    });
  } catch { return []; }
};

// Remove processed events
const removeEvents = async (ids: number[]) => {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    ids.forEach(id => store.delete(id));
  } catch {}
};

// Increment retry count for failed events
const incrementRetry = async (ids: number[]) => {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    ids.forEach(id => {
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (record) {
          record.retries = (record.retries || 0) + 1;
          store.put(record);
        }
      };
    });
  } catch {}
};

// Process the queue - send pending events
const processQueue = async () => {
  if (isProcessing || !navigator.onLine) return;
  isProcessing = true;

  try {
    const pending = await getPendingEvents();
    if (pending.length === 0) {
      isProcessing = false;
      return;
    }

    const events = pending.map(p => p.event);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server-track`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(events),
    });

    if (response.ok) {
      await removeEvents(pending.map(p => p.id));
    } else {
      await incrementRetry(pending.map(p => p.id));
    }
  } catch {
    // Network error, will retry later
  }

  isProcessing = false;
};

// Initialize the offline queue system
export const initOfflineQueue = () => {
  if (typeof window === 'undefined') return;

  // Process queue when coming back online
  window.addEventListener('online', () => {
    setTimeout(processQueue, 2000);
  });

  // Periodic retry
  retryTimer = setInterval(() => {
    if (navigator.onLine) processQueue();
  }, RETRY_INTERVAL);

  // Process on load if online
  if (navigator.onLine) {
    setTimeout(processQueue, 5000);
  }
};

// Get queue status
export const getQueueStatus = async () => {
  try {
    const database = await openDB();
    return new Promise<{ pending: number; online: boolean }>((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const countReq = tx.objectStore(STORE_NAME).count();
      countReq.onsuccess = () => resolve({ pending: countReq.result, online: navigator.onLine });
      countReq.onerror = () => resolve({ pending: 0, online: navigator.onLine });
    });
  } catch { return { pending: 0, online: navigator.onLine }; }
};

export const stopOfflineQueue = () => {
  if (retryTimer) clearInterval(retryTimer);
};
