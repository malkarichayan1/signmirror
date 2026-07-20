// Thin wrapper around Firebase Auth (email/password). Kept separate from
// cloudSync.js so "who is signed in" and "how their data syncs" stay
// independently testable, matching this app's one-concern-per-file
// convention (see masteryProgress.js).

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase.js';

// Firebase's own error codes are stable but not user-friendly; map the
// common ones so AuthScreen can show a sentence instead of "auth/weak-password".
const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts — try again in a bit.',
};

function friendlyError(err) {
  return ERROR_MESSAGES[err?.code] ?? 'Something went wrong. Please try again.';
}

export async function signUp(email, password) {
  if (!isFirebaseConfigured) throw new Error('Sign-in isn’t configured yet.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}

export async function signIn(email, password) {
  if (!isFirebaseConfigured) throw new Error('Sign-in isn’t configured yet.');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    throw new Error(friendlyError(err));
  }
}

export async function signOutUser() {
  if (!isFirebaseConfigured) return;
  await signOut(auth);
}

// Subscribes to auth state; returns an unsubscribe function. callback
// receives the Firebase user object, or null when signed out.
export function watchAuthState(callback) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
