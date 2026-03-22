const GLOBAL_KEY = '__paresSecurityMemoryStore__';

function getStore() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      counters: new Map(),
      lastCleanupAt: 0,
    };
  }
  return globalThis[GLOBAL_KEY];
}

function cleanupExpired(now = Date.now()) {
  const store = getStore();
  // Avoid cleanup on every request.
  if (now - store.lastCleanupAt < 30_000) return;
  store.lastCleanupAt = now;

  for (const [key, entry] of store.counters.entries()) {
    if (entry.expiresAt <= now) {
      store.counters.delete(key);
    }
  }
}

export function incrementCounter(key, windowMs) {
  const now = Date.now();
  cleanupExpired(now);
  const store = getStore();
  const existing = store.counters.get(key);

  if (!existing || existing.expiresAt <= now) {
    const next = { count: 1, expiresAt: now + windowMs };
    store.counters.set(key, next);
    return next;
  }

  existing.count += 1;
  store.counters.set(key, existing);
  return existing;
}

export function getCounter(key) {
  const now = Date.now();
  cleanupExpired(now);
  const store = getStore();
  const entry = store.counters.get(key);
  if (!entry || entry.expiresAt <= now) return { count: 0, expiresAt: now };
  return entry;
}
