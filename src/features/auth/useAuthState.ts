'use client';

import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { listWorkspaces, type Workspace } from '@/features/workspaces/api';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const ws = await listWorkspaces();
          setWorkspaces(ws);
        } catch (err) {
          console.error('Failed to list workspaces:', err);
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleGoogleSubmit() {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert('ログインに失敗しました。');
      setLoading(false);
    }
  }

  function handleEmailSubmit() {
    alert('メールアドレス認証は現在準備中です。Googleログインをご利用ください。');
  }

  return {
    user,
    loading,
    workspaces,
    setWorkspaces,
    handleGoogleSubmit,
    handleEmailSubmit,
  };
}
