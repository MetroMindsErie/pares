# Pares Debug Log

Use this file to paste errors so Copilot can quickly diagnose issues. Copy the template below for each new error.

---

## Template

```
### [Date] — Short description
**Page/Action:** (e.g., "Clicked property from search results")
**Error type:** (Runtime / Build / Console / Network)
**Error message:**
(paste full error here)

**Call stack:** (if available)
(paste stack trace)

**Browser console errors:** (if any)

**Steps to reproduce:**
1.
2.
3.

**What was expected:**

**What happened instead:**
```

---

## Resolved Issues

### 2026-03-14 — QuotaExceededError on localStorage cache
**Page/Action:** Clicked "Erie" quick search chip
**Error type:** Runtime
**Error message:**
```
Failed to execute 'setItem' on 'Storage': Setting the value of 'pares_search_cache' exceeded the quota.
```
**Call stack:** `cacheSearchResults` → `handleSearchResults` → `handleSubmit`
**Root cause:** Trestle listings include massive Media arrays + dozens of fields. Caching raw results blew past localStorage's ~5MB limit.
**Fix:** Added `trimListing()` to strip each listing to rendering-essential fields, capped at 75 listings, and added `safeCacheSet()` that clears stale caches and retries on quota errors. File: `src/lib/searchCache.js`

---

### 2026-03-14 — Cannot find module './9770.js' (webpack-runtime)
**Page/Action:** Clicked on a property from search results → `/property/[id]`
**Error type:** Runtime (server-side)
**Error message:**
```
Cannot find module './9770.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/pages/_document.js
```
**Root cause:** Stale `.next` build cache — webpack chunk IDs shifted after code changes but the cached build output still referenced old chunk filenames.
**Fix:** `rm -rf .next && npx next build` (or `npx next dev` which auto-rebuilds). This is a common Next.js issue after significant code changes.
**Prevention:** If you see any "Cannot find module" error referencing `.next/server/`, always try clearing `.next` first.

---

## Common Fixes Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Cannot find module './XXXX.js'` in `.next/server/` | Stale webpack cache | `rm -rf .next && npm run dev` |
| `QuotaExceededError` on localStorage | Cached data too large | Check `src/lib/searchCache.js` trimming logic |
| `TypeError: Cannot read properties of undefined` in search | Trestle API returned unexpected shape | Check `src/services/trestleServices.js` null guards |
| `401 Unauthorized` on `/api/trestle/*` | OAuth token expired or env vars missing | Check `TRESTLE_CLIENT_ID` / `TRESTLE_CLIENT_SECRET` in `.env` |
| `CORS` or `fetch failed` on Supabase | Wrong Supabase URL or anon key | Check `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Build fails with `Module not found` | Import path wrong or file doesn't exist | Check the import path in the error — usually a typo or missing file |
| `hydration mismatch` warnings | Server/client HTML differs | Wrap browser-only code in `useEffect` or use `NoSSR` component |
| Property page shows blank/error | ListingKey format issue | Trestle sometimes needs numeric vs quoted keys — check `getPropertyDetails()` fallbacks |

## Key Files for Debugging

- **Search flow:** `src/components/SearchBar.js` → `src/services/trestleServices.js` → `src/components/SearchResults.js`
- **API proxy:** `src/pages/api/trestle/[...path].js` (proxies all Trestle OData calls)
- **Auth/tokens:** `src/lib/trestleServer.js` (server-side), `token.js` (legacy)
- **Cache (browser):** `src/lib/searchCache.js`
- **Cache (database):** `src/lib/propertyCache.js` → `src/app/api/property-cache/route.js`
- **Autocomplete:** `src/app/api/autocomplete/route.js`
- **Property detail:** `src/pages/property/[id].js` or `src/app/property/[id]/page.js`
- **Supabase admin:** `src/lib/supabaseAdmin.js`
- **Supabase client:** `src/utils/supabaseClient.js`
