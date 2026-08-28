const PASSWORD_HASH_KEY = 'ag-study-admin-password-hash';
const ADMIN_SESSION_KEY = 'ag-study-admin-session';

// SHA-256 digest of the initial administrator password. The password itself is
// never rendered in the interface or sent to the browser as plain text.
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

const storedHash = () => {
  try {
    return window.localStorage.getItem(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
  } catch {
    return DEFAULT_PASSWORD_HASH;
  }
};

export const isAdminUnlocked = () => {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'unlocked';
  } catch {
    return false;
  }
};

export const unlockAdmin = async (password) => {
  if (!password) return false;
  const matches = constantTimeEqual(await digest(password), storedHash());
  if (matches) window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'unlocked');
  return matches;
};

export const lockAdmin = () => {
  try { window.sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* storage can be disabled */ }
};

export const changeAdminPassword = async (currentPassword, nextPassword) => {
  if (!nextPassword || nextPassword.length < 4) throw new Error('Use at least 4 characters for the new password.');
  if (!(await unlockAdmin(currentPassword))) throw new Error('The current password is not correct.');
  window.localStorage.setItem(PASSWORD_HASH_KEY, await digest(nextPassword));
  return true;
};

export const resetAdminPassword = () => {
  window.localStorage.removeItem(PASSWORD_HASH_KEY);
  lockAdmin();
};

export const getDefaultPasswordHash = () => DEFAULT_PASSWORD_HASH;
