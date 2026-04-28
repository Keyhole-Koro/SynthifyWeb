'use client';

import type { Unsubscribe } from 'firebase/auth';
import { env } from '@/config/env';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: 'firebase' | 'e2e';
};

const E2E_USER: AuthUser = {
  id: env.e2e.userId!,
  email: env.e2e.userEmail ?? 'e2e@example.com',
  name: env.e2e.userName ?? 'E2E User',
  provider: 'e2e',
};

let currentUser: AuthUser | null = E2E_USER;
const listeners = new Set<(user: AuthUser | null) => void>();

export function getInitialAuthUser(): AuthUser | null {
  return currentUser;
}

export function subscribeAuthUser(callback: (user: AuthUser | null) => void): Unsubscribe {
  callback(currentUser);
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function signInWithGoogleSession(): Promise<void> {
  currentUser = E2E_USER;
  listeners.forEach((l) => l(currentUser));
}

export async function signOutSession(): Promise<void> {
  currentUser = null;
  listeners.forEach((l) => l(null));
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!currentUser) return {};
  return {
    'X-E2E-User-Id': currentUser.id,
    ...(currentUser.email ? { 'X-E2E-User-Email': currentUser.email } : {}),
  };
}
