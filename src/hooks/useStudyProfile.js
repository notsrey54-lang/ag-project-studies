import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRemoteProfile,
  getSession,
  loadProfile,
  mergeProfiles,
  persistProfile,
  putRemoteProfile,
  signOutRemote,
} from '../lib/studyProfile';

const getSyncFeedback = () => {
  const syncState = new URLSearchParams(window.location.search).get('sync');
  const messages = {
    cancelled: 'GitHub sign-in was cancelled. Your study space is still saved on this device.',
    error: 'GitHub sign-in did not complete. Please try again when you are ready.',
    setup: 'GitHub sync is not configured for this deployment yet. Your study space is still saved on this device.',
  };

  if (syncState && messages[syncState]) {
    const url = new URL(window.location.href);
    url.searchParams.delete('sync');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return messages[syncState] || '';
};

export function useStudyProfile() {
  const [profile, setProfile] = useState(loadProfile);
  const [session, setSession] = useState({ status: 'checking', user: null, message: '' });
  const hasLoadedSession = useRef(false);

  const updateProfile = useCallback((updater) => {
    setProfile((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      persistProfile(next);
      return next;
    });
  }, []);

  const pullProfile = useCallback(async () => {
    const result = await getRemoteProfile();
    if (result.profile) {
      setProfile((local) => {
        const merged = mergeProfiles(local, result.profile);
        persistProfile(merged);
        return merged;
      });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const syncFeedback = getSyncFeedback();
    try {
      const result = await getSession();
      if (result.authenticated) {
        setSession({ status: 'signed-in', user: result.user, message: 'Your study space is synced.' });
        await pullProfile().catch(() => {
          setSession((current) => ({ ...current, message: 'Signed in. Your latest changes are safe on this device.' }));
        });
      } else {
        setSession({ status: 'guest', user: null, message: syncFeedback || 'Your progress is saved on this device.' });
      }
    } catch {
      setSession({ status: 'guest', user: null, message: syncFeedback || 'Use GitHub sign-in to sync across devices.' });
    } finally {
      hasLoadedSession.current = true;
    }
  }, [pullProfile]);

  const syncNow = useCallback(async () => {
    if (session.status !== 'signed-in') return;
    setSession((current) => ({ ...current, message: 'Saving your study space…' }));
    try {
      await putRemoteProfile(profile);
      setSession((current) => ({ ...current, status: 'signed-in', message: 'All changes are synced.' }));
    } catch (error) {
      setSession((current) => ({ ...current, status: 'signed-in', message: error.message || 'Your latest changes are stored on this device.' }));
    }
  }, [profile, session.status]);

  const startSignIn = () => {
    window.location.assign('/.netlify/functions/auth?action=login');
  };

  const signOut = useCallback(async () => {
    try {
      await signOutRemote();
    } finally {
      setSession({ status: 'guest', user: null, message: 'Signed out. This device still keeps your local study space.' });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!hasLoadedSession.current || session.status !== 'signed-in') return undefined;
    const timer = window.setTimeout(() => {
      syncNow();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [profile.updatedAt, session.status, syncNow]);

  return {
    profile,
    updateProfile,
    session,
    startSignIn,
    signOut,
    syncNow,
    refreshSession,
  };
}
