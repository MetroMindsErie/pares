const DEFAULT_STORAGE = 'local';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getStorage(storage) {
  if (!isBrowser()) return null;
  if (storage === 'session') return window.sessionStorage;
  return window.localStorage;
}

export function makeUserCacheKey({ namespace, version = 'v1', userId = 'anon', parts = [] }) {
  const safeNs = String(namespace || 'cache').trim();
  const safeUser = userId ? String(userId) : 'anon';
  const suffix = Array.isArray(parts) && parts.length ? `:${parts.map(String).join(':')}` : '';
  return `${safeNs}:${version}:${safeUser}${suffix}`;
}

function nowMs() {
  return Date.now();
}

export function cacheSet(key, data, { ttlMs, storage = DEFAULT_STORAGE } = {}) {
  const store = getStorage(storage);
  if (!store || !key) return false;

  const payload = {
    savedAt: nowMs(),
    ttlMs: Number.isFinite(ttlMs) ? ttlMs : null,
    data,
  };

  try {
    store.setItem(String(key), JSON.stringify(payload));
    return true;
  } catch (err) {
    // If storage is full or blocked, fail silently.
    return false;
  }
}

export function cacheGetEntry(key, { ttlMs, storage = DEFAULT_STORAGE } = {}) {
  const store = getStorage(storage);
  if (!store || !key) return null;

  try {
    const raw = store.getItem(String(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Support both the new wrapper format { savedAt(ms), ttlMs, data }
    // and legacy ad-hoc formats where the object itself is the data.
    let savedAt = Number(parsed?.savedAt);
    if (!Number.isFinite(savedAt) && typeof parsed?.savedAt === 'string') {
      const legacyParsed = Date.parse(parsed.savedAt);
      if (Number.isFinite(legacyParsed)) savedAt = legacyParsed;
    }

    // Some legacy caches used "ts" instead of "savedAt".
    if (!Number.isFinite(savedAt) && Number.isFinite(parsed?.ts)) {
      savedAt = Number(parsed.ts);
    }

    const storedTtl = Number.isFinite(parsed?.ttlMs) ? Number(parsed.ttlMs) : null;
    const effectiveTtl = Number.isFinite(ttlMs) ? Number(ttlMs) : storedTtl;

    if (Number.isFinite(savedAt) && Number.isFinite(effectiveTtl) && effectiveTtl > 0) {
      if (nowMs() - savedAt > effectiveTtl) {
        store.removeItem(String(key));
        return null;
      }
    }

    const data = Object.prototype.hasOwnProperty.call(parsed || {}, 'data') ? parsed?.data : parsed;
    return { data: data ?? null, savedAt: Number.isFinite(savedAt) ? savedAt : null };
  } catch (err) {
    try {
      store.removeItem(String(key));
    } catch (e) {}
    return null;
  }
}

export function cacheGet(key, { ttlMs, storage = DEFAULT_STORAGE } = {}) {
  const entry = cacheGetEntry(key, { ttlMs, storage });
  return entry?.data ?? null;
}

export function cacheRemove(key, { storage = DEFAULT_STORAGE } = {}) {
  const store = getStorage(storage);
  if (!store || !key) return;
  try {
    store.removeItem(String(key));
  } catch (err) {}
}

export function cacheClearByPrefix(prefix, { storage = DEFAULT_STORAGE } = {}) {
  const store = getStorage(storage);
  if (!store || !prefix) return 0;

  const p = String(prefix);
  let removed = 0;

  try {
    const keysToRemove = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(p)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => {
      try {
        store.removeItem(k);
        removed += 1;
      } catch (e) {}
    });
  } catch (err) {
    return removed;
  }

  return removed;
}
