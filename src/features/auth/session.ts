'use client';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { env } from '@/config/env';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: 'firebase' | 'e2e';
};

const e2eAuthUser: AuthUser | null = env.e2e.userId
  ? {
      id: env.e2e.userId,
      email: env.e2e.userEmail ?? 'e2e@example.com',
      name: env.e2e.userName ?? 'E2E User',
      provider: 'e2e',
    }
  : null;

function fromFirebaseUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }
  return {
    id: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? user.email ?? 'Anonymous User',
    provider: 'firebase',
  };
}

export function getInitialAuthUser(): AuthUser | null {
  if (e2eAuthUser) {
    return e2eAuthUser;
  }
  return fromFirebaseUser(auth.currentUser);
}

export function subscribeAuthUser(callback: (user: AuthUser | null) => void): Unsubscribe {
  if (e2eAuthUser) {
    callback(e2eAuthUser);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(fromFirebaseUser(user));
  });
}

export async function signInWithGoogleSession(): Promise<void> {
  if (e2eAuthUser) {
    return;
  }
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOutSession(): Promise<void> {
  if (e2eAuthUser) {
    return;
  }
  await signOut(auth);
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (e2eAuthUser) {
    return {
      'X-E2E-User-Id': e2eAuthUser.id,
      ...(e2eAuthUser.email ? { 'X-E2E-User-Email': e2eAuthUser.email } : {}),
    };
  }

  if (!auth.currentUser) {
    return {};
  }

  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export function isE2EAuthEnabled(): boolean {
  return e2eAuthUser !== null;
}
