import { apiClient } from "@/lib/api/client";

const DB_NAME = "solarflow-offline";
const DB_VERSION = 1;
const STORE_NAME = "mutations";
const DEVICE_KEY = "solarflowDeviceKey";

export type OfflineMutation = {
  id: string;
  endpoint: string;
  method: string;
  payload?: unknown;
  headers?: Record<string, string>;
  entityType: string;
  operation: string;
  company?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

function getDeviceKey() {
  let key = localStorage.getItem(DEVICE_KEY);
  if (!key) {
    key = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, key);
  }
  return key;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function enqueueOfflineMutation(input: Omit<OfflineMutation, "id" | "createdAt" | "retryCount">) {
  const mutation: OfflineMutation = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await withStore("readwrite", (store) => store.put(mutation));
  window.dispatchEvent(new CustomEvent("offline-queue-change"));
  return mutation;
}

export async function getOfflineMutations(): Promise<OfflineMutation[]> {
  return withStore("readonly", (store) => store.getAll());
}

async function removeOfflineMutation(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

async function updateOfflineMutation(mutation: OfflineMutation) {
  await withStore("readwrite", (store) => store.put(mutation));
}

export async function getOfflineQueueStatus() {
  const mutations = await getOfflineMutations();
  return {
    deviceKey: getDeviceKey(),
    queued: mutations.length,
    failed: mutations.filter((item) => item.lastError).length,
    oldestQueuedAt: mutations[0]?.createdAt || null,
  };
}

export async function flushOfflineQueue() {
  if (!navigator.onLine) return { attempted: 0, flushed: 0 };

  const mutations = await getOfflineMutations();
  let flushed = 0;

  for (const mutation of mutations.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (mutation.retryCount >= 3) {
      console.warn(`Sidelining mutation ${mutation.id} (endpoint: ${mutation.endpoint}) due to repeated failures (${mutation.retryCount} retries)`);
      continue;
    }
    try {
      await apiClient.request({
        url: mutation.endpoint,
        method: mutation.method,
        data: mutation.payload,
        headers: {
          ...mutation.headers,
          "x-idempotency-key": mutation.id,
        },
      });
      await removeOfflineMutation(mutation.id);
      flushed += 1;
    } catch (error: any) {
      await updateOfflineMutation({
        ...mutation,
        retryCount: mutation.retryCount + 1,
        lastError: error?.message || "Retry failed",
      });
      break;
    }
  }

  if (flushed > 0) {
    window.dispatchEvent(new CustomEvent("offline-queue-change"));
  }

  return { attempted: mutations.length, flushed };
}

export function installOfflineQueueAutoFlush() {
  const flush = () => void flushOfflineQueue();
  window.addEventListener("online", flush);
  window.addEventListener("focus", flush);
  setTimeout(flush, 500);
  return () => {
    window.removeEventListener("online", flush);
    window.removeEventListener("focus", flush);
  };
}
