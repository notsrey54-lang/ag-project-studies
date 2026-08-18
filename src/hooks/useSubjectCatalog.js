import { useCallback, useEffect, useState } from 'react';
import { SUBJECTS } from '../data/courses';
import { normalizeContentDocument, normalizeSubject } from '../lib/contentModel';

const CONTENT_URL = '/content/subjects.json';

export function useSubjectCatalog() {
  const [subjects, setSubjects] = useState(() => SUBJECTS.map(normalizeSubject));
  const [contentStatus, setContentStatus] = useState('loading');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${CONTENT_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Published content is not available.');
      const document = normalizeContentDocument(await response.json());
      if (document.subjects.length) setSubjects(document.subjects);
      setContentStatus('published');
    } catch {
      setContentStatus('fallback');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const replaceSubjects = useCallback((nextSubjects) => {
    const normalized = (nextSubjects || []).map(normalizeSubject);
    setSubjects(normalized);
    return normalized;
  }, []);

  return { subjects, contentStatus, refresh, replaceSubjects };
}
