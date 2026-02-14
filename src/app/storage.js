function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorageItem(key) {
  if (!hasStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key, value) {
  if (!hasStorage()) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key) {
  if (!hasStorage()) return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
