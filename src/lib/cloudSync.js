// Syncs the app's four localStorage blobs (progress, mastery, stats,
// settings) to/from a single Firestore doc per user. Kept separate from
// auth.js so "who is signed in" and "how their data syncs" stay
// independently testable.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.js';

const SYNCED_KEYS = {
  progress: 'signmirror_progress',
  mastery: 'signmirror_mastery',
  stats: 'signmirror_stats',
  settings: 'signmirror_settings',
};

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  if (value === null || value === undefined) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Pulls the user's cloud data down into localStorage, overwriting whatever
// is there locally. Use on sign-in to an existing account — the cloud is
// the source of truth for a returning user, possibly on a new device.
// Returns true if a cloud doc existed (false for a brand-new account).
export async function pullCloudData(uid) {
  if (!isFirebaseConfigured || !db) return false;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const data = snap.data();
  for (const [field, storageKey] of Object.entries(SYNCED_KEYS)) {
    if (data[field] !== undefined) writeLocal(storageKey, data[field]);
  }
  return true;
}

// Pushes current localStorage state up to Firestore. Use right after
// sign-up (so any guest progress made before creating an account carries
// into it) and after every progress-affecting change while signed in.
export async function pushLocalData(uid) {
  if (!isFirebaseConfigured || !db) return;
  const payload = { updatedAt: serverTimestamp() };
  for (const [field, storageKey] of Object.entries(SYNCED_KEYS)) {
    const value = readLocal(storageKey);
    if (value !== null) payload[field] = value;
  }
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
}
