import { getSupabaseConfig, supabaseHeaders } from './supabaseClient.js';

const PASSWORD_HASH_KEY = 'ag-study-admin-password-hash';
const ADMIN_SESSION_KEY = 'ag-study-admin-session';

// SHA-256 digest of the initial administrator password. The plain password is
// never rendered in the interface or stored in this source file.
const DEFAULT_PASSWORD_HASH = 'ecd6512bdf3b727d065dec7da7b0523023594a474c7fb63bf0efce1e8d080da6';

const digest = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const buffer = await window.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const constantTimeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};

const localHash = () => {
  try {
    return window.localStorage.getItem(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
  } catch {
    return DEFAULT_PASSWORD_HASH;
  }
};

const callAuthFunction = async (body) => {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/functions/v1/content-publish`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'The administrator service rejected the request.');
    error.status = response.status;
    throw error;
  }
  return payload;
};

const isNetworkError = (error) => !error?.status;

export const isAdminUnlocked = () => {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'unlocked';
  } catch {
    return false;
  }
};

export const unlockAdmin = async (password) => {
  if (!password) return false;
  try {
    const payload = await callAuthFunction({ action: 'verify', password });
    if (payload?.ok) window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'unlocked');
    return Boolean(payload?.ok);
  } catch (error) {
    // Keep local development usable if the hosted function is temporarily
    // unreachable. A publish still requires the hosted function.
    if (!isNetworkError(error)) return false;
    const matches = constantTimeEqual(await digest(password), localHash());
    if (matches) window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'unlocked');
    return matches;
  }
};

export const lockAdmin = () => {
  try { window.sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* storage can be disabled */ }
};

export const changeAdminPassword = async (currentPassword, nextPassword) => {
  if (!nextPassword || nextPassword.length < 4) throw new Error('Use at least 4 characters for the new password.');
  try {
    const payload = await callAuthFunction({ action: 'change_password', password: currentPassword, nextPassword });
    if (!payload?.ok) throw new Error('The current password is not correct.');
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    if (!(await unlockAdmin(currentPassword))) throw new Error('The current password is not correct.');
  }
  window.localStorage.setItem(PASSWORD_HASH_KEY, await digest(nextPassword));
  return true;
};

export const resetAdminPassword = async (currentPassword) => {
  try {
    const payload = await callAuthFunction({ action: 'reset_password', password: currentPassword });
    if (!payload?.ok) throw new Error('The current password is not correct.');
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    window.localStorage.removeItem(PASSWORD_HASH_KEY);
  }
  lockAdmin();
  return true;
};

export const getDefaultPasswordHash = () => DEFAULT_PASSWORD_HASH;
