import { getSupabaseConfig, supabaseHeaders } from './supabaseClient.js';

const MAX_ASSET_BYTES = 5_500_000;

const OFFICE_TYPES = Object.freeze({
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
});

const extensionFor = (name) => String(name || '').split('.').pop()?.toLowerCase() || '';

export const contentTypeForFile = (file) => file?.type || OFFICE_TYPES[extensionFor(file?.name)] || 'application/octet-stream';

const studioRequest = async (password, action, payload = {}) => {
  if (!password) throw new Error('Reopen Administrator and enter the password again.');
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/functions/v1/content-publish`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ action, password, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'The Content Studio service could not complete that action.');
    error.status = response.status;
    error.code = result.code;
    error.payload = result;
    throw error;
  }
  return result;
};

export const loadCloudStudioDraft = (password, draftKey = 'main') => studioRequest(password, 'load_draft', { draftKey });

export const saveCloudStudioDraft = (password, document, options = {}) => studioRequest(password, 'save_draft', {
  draftKey: options.draftKey || 'main',
  document,
  baseVersion: Number(options.baseVersion || 0),
  checkpoint: Boolean(options.checkpoint),
  label: options.label || '',
  kind: options.kind || 'manual',
});

export const listCloudStudioVersions = (password, draftKey = 'main') => studioRequest(password, 'list_versions', { draftKey });

export const loadCloudStudioVersion = (password, version, draftKey = 'main') => studioRequest(password, 'load_version', { draftKey, version });

export const restoreCloudStudioVersion = (password, version, baseVersion, draftKey = 'main') => studioRequest(password, 'restore_version', { draftKey, version, baseVersion });

export const updateStudioPresence = (password, details) => studioRequest(password, 'presence', {
  draftKey: details.draftKey || 'main',
  sessionId: details.sessionId,
  label: details.label || 'Administrator',
  subjectId: details.subjectId || '',
  pageId: details.pageId || '',
});

const fileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('The selected file could not be read.'));
  reader.onload = () => {
    const value = String(reader.result || '');
    const separator = value.indexOf(',');
    if (separator === -1) reject(new Error('The selected file could not be encoded.'));
    else resolve(value.slice(separator + 1));
  };
  reader.readAsDataURL(file);
});

export const uploadStudioAsset = async (password, file) => {
  if (!file) throw new Error('Choose a file first.');
  if (file.size > MAX_ASSET_BYTES) throw new Error('Choose a file smaller than 5.5 MB.');
  return studioRequest(password, 'upload_asset', {
    fileName: file.name,
    contentType: contentTypeForFile(file),
    data: await fileAsBase64(file),
  });
};

export const studioAssetLimit = MAX_ASSET_BYTES;
