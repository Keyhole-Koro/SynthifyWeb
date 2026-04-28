'use client';

import { env } from '@/config/env';
import type { Unsubscribe } from 'firebase/auth';
import * as firebaseSession from './session';
import * as e2eSession from './session.e2e';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: 'firebase' | 'e2e';
};

// NEXT_PUBLIC_E2E_USER_ID is inlined at build time — the unused branch is
// dead-code eliminated from production bundles.
const impl = env.e2e.userId ? e2eSession : firebaseSession;

export function getInitialAuthUser(): AuthUser | null {
  return impl.getInitialAuthUser() as AuthUser | null;
}

export function subscribeAuthUser(callback: (user: AuthUser | null) => void): Unsubscribe {
  return impl.subscribeAuthUser(callback);
}

export async function signInWithGoogleSession(): Promise<void> {
  return impl.signInWithGoogleSession();
}

export async function signOutSession(): Promise<void> {
  return impl.signOutSession();
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  return impl.getAuthHeaders();
}
