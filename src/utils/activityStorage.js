import { cacheGet, cacheRemove, cacheSet, makeUserCacheKey } from './clientCache';

const MAX_ITEMS = 50;
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function nowMs() {
  return Date.now();
}

function normalizeItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];

  // Support a few legacy/wrapper shapes.
  if (typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.value)) return raw.value;
  }

  return [];
}

export function getUserActivity(userId, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!userId) return [];

  const key = makeUserCacheKey({ namespace: 'userActivity', version: 'v1', userId });
  const raw = cacheGet(key, { ttlMs });
  const items = normalizeItems(raw);
  if (!Array.isArray(raw) && raw != null && items.length === 0) {
    // Heal corrupt/legacy values so we don't repeatedly crash the UI.
    cacheRemove(key);
  }

  const cutoff = nowMs() - ttlMs;
  return items
    .filter((it) => it && typeof it === 'object')
    .filter((it) => typeof it.ts === 'number' && it.ts >= cutoff)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, MAX_ITEMS);
}

export function pushUserActivity(userId, item) {
  if (!userId) return;
  if (!item || typeof item !== 'object') return;

  const normalized = {
    ts: typeof item.ts === 'number' ? item.ts : nowMs(),
    type: String(item.type || 'unknown'),
    title: String(item.title || ''),
    meta: item.meta && typeof item.meta === 'object' ? item.meta : undefined,
  };

  const existing = getUserActivity(userId);
  const next = [normalized, ...existing].slice(0, MAX_ITEMS);

  const key = makeUserCacheKey({ namespace: 'userActivity', version: 'v1', userId });
  cacheSet(key, next, { ttlMs: DEFAULT_TTL_MS });
}

export function clearUserActivity(userId) {
  if (!userId) return;
  const key = makeUserCacheKey({ namespace: 'userActivity', version: 'v1', userId });
  cacheRemove(key);
}
