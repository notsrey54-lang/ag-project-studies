import { useCallback, useState } from 'react';
import { loadProfile, persistProfile } from '../lib/studyProfile';

export function useStudyProfile() {
  const [profile, setProfile] = useState(loadProfile);

  const updateProfile = useCallback((updater) => {
    setProfile((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      persistProfile(next);
      return next;
    });
  }, []);

  return {
    profile,
    updateProfile,
  };
}
