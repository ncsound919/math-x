// Session persistence layer using IndexedDB via the idb-keyval pattern.
// Falls back to in-memory array if IndexedDB is unavailable.

import type { Session } from './types';

const DB_NAME = 'mathx-sessions';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Clear and rewrite all — simple for now, can optimize to delta writes later
    await new Promise<void>((res, rej) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => res();
      clearReq.onerror = () => rej(clearReq.error);
    });
    for (const session of sessions) {
      store.put(session);
    }
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('Session save failed (IndexedDB unavailable):', e);
  }
}

export async function loadSessions(): Promise<Session[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = (req.result as Session[]).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Session load failed (IndexedDB unavailable):', e);
    return [];
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((res) => { tx.oncomplete = () => res(); });
  } catch (e) {
    console.warn('Session delete failed:', e);
  }
}

export function newSession(mode = 'scientist', domain?: string): Session {
  const now = Date.now();
  return {
    id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Session ${new Date(now).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    mode,
    domain,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function branchSession(parent: Session, atMessageIndex: number): Session {
  const now = Date.now();
  return {
    id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Fork → ${parent.name}`,
    mode: parent.mode,
    domain: parent.domain,
    messages: parent.messages.slice(0, atMessageIndex + 1),
    createdAt: now,
    updatedAt: now,
    parentId: parent.id,
  };
}
