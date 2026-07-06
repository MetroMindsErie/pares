# pares.homes Improvement Plan

Audit date: 2026-07-05. Findings ordered by severity within each section.
Goal: make this the best real estate site for the Erie / Warren / Crawford county niche.

---

## 1. Security

### 🔴 Critical

**S1. Trestle client secret is shipped to the browser.** ✅ FIXED 2026-07-05 (env block removed; server-only `TRESTLE_*` vars; dead utils deleted) — ⚠️ **still must rotate Trestle credentials + update Cloudflare env**
`next.config.js` injects `NEXT_PUBLIC_TRESTLE_CLIENT_SECRET` (and client ID / token URL) via the `env:` block. Anything `NEXT_PUBLIC_` or in that block is inlined into the public JS bundle — anyone can extract the MLS credentials from view-source.
- Fix: delete the `env:` block from `next.config.js`; use server-only `TRESTLE_CLIENT_ID` / `TRESTLE_CLIENT_SECRET` (already supported by `src/lib/trestleServer.js`); update `src/utils/serverAuth.js`, `src/utils/apiHelpers.js`, `src/utils/validateEnv.js`, `src/pages/api/properties.js`.
- **Rotate the Trestle credentials after the fix ships** — assume they're compromised.

**S2. `/api/user-token` returns any user's Facebook access token, unauthenticated.** ✅ FIXED 2026-07-05 (route + dead caller `authUtils.js` deleted; `/api/auth/facebook-token` same hole, also deleted; `store-facebook-token` now requires the caller's JWT and only accepts own user_id)
`GET /api/user-token?user_id=<any-uuid>` reads `auth_providers` / `users` with the service-role key and returns raw `access_token` values. Anyone who can guess/enumerate user IDs can steal Facebook tokens.
- Fix: require the caller's Supabase JWT (`auth.getUser(bearer)`) and only ever return the caller's own record — or better, never return raw tokens to the client; do Facebook calls server-side.
- Also: `provider` from the query string is interpolated into the column list (`${provider}_access_token`) — whitelist `['facebook']`.

**S3. Supabase service-role key is named `NEXT_PUBLIC_SUPABASE_SERVICE_KEY`.** ✅ FIXED 2026-07-05 (renamed to `SUPABASE_SERVICE_KEY` in all 11 files + `.env`) — ⚠️ **still must rotate the key in Supabase + update Cloudflare env**
Used across ~10 API routes plus `src/lib/supabaseAdmin.js`. The `NEXT_PUBLIC_` prefix means any client-side reference inlines the full-admin key into the public bundle — one accidental import away from total DB compromise.
- Fix: rename to `SUPABASE_SERVICE_KEY` everywhere (env + code), rotate the key in Supabase.

### 🟠 High

**S4. `/api/token` hands the Trestle MLS access token to anonymous visitors.** ✅ FIXED 2026-07-05 (route deleted; all client code now goes through `/api/trestle/*` proxy, incl. `localContextService`)
Any visitor can `POST /api/token` and get a live MLS token (full Trestle API access on John's account, quota + ToS risk). Also leaks `error.message` details on failure.
- Fix: keep all Trestle calls behind server routes (`/api/trestle/*`) and stop exposing the raw token; remove `details` from error responses.

**S5. `/api/setup-database` "auth" is just header-exists.** ✅ FIXED 2026-07-05 (gated on `super_admin` via shared `src/lib/apiAuth.js`; admin routes refactored to use it too)
`if (!req.headers.authorization)` — literally any value passes, then it runs service-role RPCs.
- Fix: delete this route (setup belongs in Supabase migrations), or gate it with the real admin-role check used in `api/admin/contacts.js`.

### 🟡 Medium

**S6. Turnstile bypasses.** ✅ FIXED 2026-07-05 (`__dev_bypass__` rejected in production; missing-secret bypass now warns loudly in prod). `verifyTurnstileToken` accepts the literal token `__dev_bypass__` in every environment, and silently passes if `TURNSTILE_SECRET_KEY` is unset. Gate both on `process.env.NODE_ENV !== 'production'`.

**S7. No security headers anywhere.** ✅ MOSTLY FIXED 2026-07-05 (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy + baseline CSP `frame-ancestors/object-src/base-uri` set in middleware). Full CSP shipped 2026-07-06 (default-src/script-src/connect-src/frame-src allowlists in middleware; `'unsafe-inline'` still required by GTM/GA + Next inline runtime — nonce migration is the last step). No CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. Add a `headers()` block in `next.config.js` (or set them in `src/middleware.js`). Start with a report-only CSP given GTM/GA inline scripts.

**S8. Internal risk telemetry exposed to clients.** ✅ FIXED 2026-07-05 (headers removed; riskScore/reasons stripped from all client responses, kept in server logs). Middleware sets `x-risk-score` / `x-turnstile-required` response headers on every page, and 429 responses include `riskScore` + `reasons` — this teaches bots how to tune around the risk engine. Log server-side instead.

**S9. Error details leak.** ✅ FIXED 2026-07-05 (`details: error.message` removed from ~20 API responses). Several routes return `details: error.message` (e.g. `/api/token`). Return generic messages; log the detail.

### 🟢 Lower / hygiene

**S10. Dead dependency attack surface.** ✅ FIXED 2026-07-06 (removed 15 unused deps incl. `ethers`, `express`, `passport`, `jsonwebtoken`, `redis`; `npm audit fix` applied — 28→15 vulns, 0 critical). Remaining 7 high are transitive (`d3-color` via react-simple-maps, `undici`, `ws`) and need breaking upgrades. `express`, `express-session`, `passport`, `passport-facebook`, `cookie-parser`, `cors`, `jsonwebtoken`, `ethers` (a blockchain lib!), `node-fetch`, `redis` appear unused by the Next.js app. Remove, then run `npm audit` and fix what remains.

**S11. Debug tooling shipped to prod.** ✅ FIXED 2026-07-06 (deleted `FacebookDebugger.js`, `auth-debug.js`, `debug-helper.js`, `api/auth/debug-facebook-connection.js` — all unreferenced). `FacebookDebugger.js`, `auth-debug.js`, `debug-helper.js`, `api/auth/debug-facebook-connection.js` — remove from production builds or gate behind admin role.

**S12. `proxy-image.js` suffix match.** ✅ FIXED 2026-07-06 (exact-host entries no longer suffix-match). `hostname.endsWith('graph.facebook.com')` also matches `evilgraph.facebook.com` (harmless today since it's still under facebook.com, but make all entries leading-dot suffixes or exact-host matches for consistency).

---

## 2. Performance & Telemetry

**P1. Images are the biggest win.** ✅ MOSTLY FIXED 2026-07-06 (global custom `next/image` loader → `/api/proxy-image?w=` with CF resizing, so SearchResults/FeaturedListings get real srcsets; raw `<img>` converted with srcset+lazy in AgentPropertiesSection, ImageGallery, PropertyGallery, PropertySwiper card). Remaining: long tail of ~25 misc `<img>` tags (profiles, blog, dashboard). `images.unoptimized: true` plus 34 files using raw `<img>` and only one `next/image` usage. On Cloudflare Pages, route listing photos through the existing `/api/proxy-image?w=` (it already supports Cloudflare image resizing) with proper `srcset`/`sizes`, lazy-loading below the fold, and explicit width/height to kill CLS. Target LCP < 2.5s on the property grid.

**P2. Kill the placeholder-redirect hack.** ✅ FIXED 2026-07-06 (redirects removed; real `fallback-property.jpg` — was a 0-byte file — and `default-agent.jpg` generated in /public). `next.config.js` 301-redirects `/fallback-property.jpg` etc. to `via.placeholder.com` — an unreliable third-party. Ship real static fallback images in `/public`.

**P3. Library consolidation.** ✅ MOSTLY FIXED 2026-07-06 (deleted dead `InteractiveRealEstateMap`/`HeatMapGraph` + removed `d3`, `react-simple-maps`, `react-heatmap-grid`, `@react-google-maps/api`, `react-intersection-observer`; chart-heavy `CryptoProperty` now dynamic — /property/[id] JS 84.9→21.6 kB). Remaining: 3 icon sets, `styled-components` (1 file: ReelsStyles.js). Currently bundling: two map stacks (`leaflet`/`react-leaflet` + `@react-google-maps/api`), three chart/dataviz libs (`chart.js`, `d3`, `react-simple-maps`, `react-heatmap-grid`), three icon sets (FontAwesome, Heroicons, Lucide), plus `framer-motion`, `styled-components` alongside Tailwind. Pick one per category; `next/dynamic` the maps and charts so they don't load on first paint.

**P4. Build/runtime config regressions.** ✅ MOSTLY FIXED 2026-07-06 (strictMode on, webpack cache restored — builds 8.6s→2.9s). Remaining: lint config is broken under ESLint 9 (`next lint` deprecated + flat-config conflict) — migrate via `npx @next/codemod@canary next-lint-to-eslint-cli`, then fix errors and re-enable in builds. `typescript` devDep installed (needed by eslint-config-next).
- `reactStrictMode: false` → enable.
- `config.cache = false` in the webpack override → remove (slows every build).
- `eslint.ignoreDuringBuilds: true` → fix lint errors and re-enable.

**P5. 485 `console.*` calls in `src/`.** ✅ FIXED 2026-07-06 (`removeConsole` in prod builds, error/warn kept). Noise, minor runtime cost, and some log user/token data. Add `compiler: { removeConsole: { exclude: ['error'] } }` for prod and introduce a tiny logger util.

**P6. Fonts.** ✅ FIXED 2026-07-06 (Poppins self-hosted via `next/font` in _app.js; render-blocking Google Fonts links removed). Google Fonts loaded via render-blocking `<link>` in `_document.js`. Move to `next/font` (self-hosted, zero layout shift).

**P7. Telemetry consolidation.** ✅ MOSTLY FIXED 2026-07-06 (removed unused `react-ga4` + `@vercel/analytics`; Web Vitals → dataLayer via `reportWebVitals`; conversion events wired: contact-form submit, phone taps, email clicks on agent page + BuyerAgent card). Remaining: verify GA4 tag inside GTM container then drop the inline gtag.js duplicate; consider Sentry (needs account). Four analytics layers exist: GTM, inline GA4, `react-ga4`, and `@vercel/analytics` (on a Cloudflare deploy, where it does nothing). Pick GA4-via-GTM only. Then add the missing observability:
- Web Vitals → GA4 (`reportWebVitals` in `_app.js`).
- Error tracking (Sentry free tier) for client + API routes.
- Conversion events that matter to John's business: contact-form submits, phone-number taps, property saves, search-to-detail rate.

**P8. `src/pages/property/[id].js` is 1,000+ lines** mixing data fetching, transformation, and UI. Split transformation into `src/lib/`, componentize the page — improves maintainability and enables code-splitting.

---

## 3. UX / UI / SEO

**U1. SEO fundamentals are missing — this is the growth lever for a niche market.** ✅ MOSTLY FIXED 2026-07-06:
- `robots.txt` + dynamic `/sitemap.xml` (edge API route + rewrite; 8 static routes + 500 active listings with lastmod).
- JSON-LD: `RealEstateAgent` (agent page), `RealEstateListing`+`Offer` (active property pages), `FAQPage` (faq).
- **Fixed the biggest SEO bug found in the audit: `Layout.js` rendered "Loading..." instead of page content in all server HTML** (auth gate on every page). Public pages now server-render fully; only /dashboard, /profile, /saved-properties, /create-profile, /admin stay gated.
- Property OG urls pointed at `www.parealestatesolutions.com` — now `SITE_URL` (pares.homes); canonical tag + templated titles added. Remaining: OG tags on more pages, decide canonical domain (pares.homes vs parealestatesolutions.com — support email + FAQ still reference the latter).
- No `robots.txt`, no `sitemap.xml` (generate from property/agent/blog routes).
- No JSON-LD structured data: add `RealEstateAgent` (John's page), `RealEstateListing` + `Offer` (property pages), `FAQPage` (faq.js). This is what gets listings rich results in Google.
- Add OpenGraph/Twitter meta with property photos on `property/[id].js` so shared links show the house, not a blank card.
- Thin titles/descriptions (e.g. "… | Pares") — template them: "3BR Colonial at 123 Main St, Erie PA | pares.homes".

**U2. Dead footer links.** ✅ FIXED 2026-07-06 (Twitter/LinkedIn `#` icons removed; Facebook links to the real page). Twitter and LinkedIn icons in `Footer.js` still point to `#` (Facebook now fixed). Get real profile URLs or remove the icons — dead social links erode trust.

**U3. Accessibility on forms.** ✅ PARTIALLY FIXED 2026-07-06 (agent contact form: aria-labels, `type="email"`, `autoComplete`, `required`, visible focus ring). Remaining: axe/Lighthouse pass across other forms (login, signup, subscribe). Agent-page contact form inputs have placeholders but no `<label>`/`aria-label`, no `required`/`type="email"` attributes, and `focus:outline-none` with no replacement ring (keyboard users can't see focus). Same pattern likely elsewhere — do a pass with axe/Lighthouse.

**U4. Agent branding.** ✅ MOSTLY FIXED 2026-07-06 (`/john-easter.jpg` generated — note source `dad.PNG` is only 150×150, get a higher-res headshot; property pages + swiper now use his real photo via shared config; swiper's `/dad.jpg` path was broken/case-mismatched). Remaining: branded email decision (john@pares.homes).
- `/dad.PNG` — rename to `/john-easter.jpg` (case-sensitive hosts + professionalism), serve an optimized ~200KB version.
- Property pages show `photo: '/default-agent.jpg'` for John — use his real photo consistently.
- Consider a branded email (john@pares.homes) over the Yahoo address for the public site (forwarding to Yahoo is fine).

**U5. Consistency of John's contact data.** ✅ FIXED 2026-07-06 (single source of truth `src/config/agent.js` — name, phone, email, agency, photo, Facebook, bio, specialties + `SITE_URL`; all 4 call sites converted). His name/phone/email/agency are hard-coded in at least 4 places (`agents/john-easter.js`, `components/Property/BuyerAgent.js`, `components/PropertySwiper/PropertyCard.js`, `pages/property/[id].js`) with slight variations ("John Easter" vs "John D. Easter", "Pennington Lines" vs "Pennington Lines Real Estate"). Extract a single `src/config/agent.js` constant.

**U6. Niche-market feature ideas** — ✅ three shipped 2026-07-06: "Ask John about this home" CTA (BuyerAgent card → agent page with `?property=` prefill); **/lakefront** curated waterfront page (live `WaterfrontYN eq true` MLS query, ~20 listings, in footer + sitemap); **mortgage calculator + PA transfer-tax estimator** on active property pages (`src/components/Property/MortgageCalculator.js`, uses real `TaxAnnualAmount` when present). Still open: neighborhood/zip landing pages, testimonials. (differentiators for Erie/Warren/Crawford):
- Neighborhood/zip landing pages with market stats (you already have county zip data) — these rank well and convert.
- "Lakefront" curated search page (Presque Isle / Lake Erie is the local hook).
- Mortgage calculator + PA/Erie county transfer-tax estimator on property pages.
- Testimonials/reviews section on John's page (pull from Facebook page reviews).
- Clear CTA above the fold on every property: "Ask John about this home" with the contact form pre-filled with the property URL (form field already exists — wire it up).

**U7. (Found 2026-07-06) Page titles were silently broken site-wide.** Two stacked bugs: (a) `<title>{expr} | text</title>` multi-child JSX — React drops these titles entirely; (b) components like `ActiveProperty` render `<Layout>` *inside* the page, so Layout's default `<Head>` overrode every page title/description. ✅ FIXED: all titles are single template literals; Layout no longer renders `<Head>` (defaults moved to `_app.js`, which renders first so pages win).

**U8. (Found 2026-07-06) Dev-only error overlay.** styled-jsx global block in `_app.js` broke webpack's dev CSS injection (`parentNode` null in leaflet.css). ✅ FIXED: font CSS variable now set via a plain `<style>` tag in `_app` Head. Also note: never run `next build` while `next dev` is running — they share `.next` and corrupt each other.

**P9. (2026-07-06) Search data layer optimized.** Every search fetched `$top=500` with full `$expand=Media` — **12 MB / 2.7s** per query (Trestle silently caps at 200 rows anyway). Now: `$select` of the ~24 card fields + `Media($select=MediaURL,Order,PreferredPhotoYN;$orderby=Order asc;$top=5)` + `$top=60` + `$count=true` → **0.14 MB / 0.8s** (~85× smaller). Applied to `searchProperties`, `getPropertiesByFilter`, `getAgentProperties`, and `/lakefront`; autocomplete responses now edge-cached (`s-maxage=86400`). Server-side `$orderby` always applied so pagination is stable. Also: `next/legacy/image` was incompatible with the custom `loaderFile` (threw "missing loader prop") — SearchResults/FeaturedListings converted to plain `<img>` with proxy srcsets like the other card components. NOTE: `import Image from 'next/image'` resolves to a namespace object in this repo (strict ESM `"type": "module"` interop) — avoid next/image in client components; use the `imageProxy` helpers.

**U9. (2026-07-06) Erie Real Estate Services LLC added to partners ticker** (`public/images/partners/partner7-erie-real-estate-services.png`, generated from Jim Brewington's business card branding).

**U10. (2026-07-06) White-on-white search suggestions for dark-mode users.** Tailwind defaulted to media-query dark mode, and the autocomplete dropdown used the invalid class `dark:bg-gray-850` (no such palette color) — so OS-dark users got a white dropdown with `dark:text-gray-100` (white) text. ✅ FIXED: `darkMode: 'class'` in tailwind.config.mjs (site renders its designed light theme for everyone; `dark:` variants inert until a real theme toggle exists) + `gray-850` → `gray-800`. Follow-up same day: the dropdown also painted UNDER the next section — framer-motion's animated hero creates a stacking context that capped the dropdown's z-50 while CityFeatures carried z-10; hero root now has z-20 (search column z-30).

---

## Suggested order of attack

1. **Now (secrets + auth):** S1–S5 + rotate Trestle & Supabase credentials.
2. **Week 1:** S6–S9 headers/bypasses; P1–P2 images; U2 dead links.
3. **Week 2:** U1 SEO package (sitemap, JSON-LD, OG tags); P7 telemetry cleanup + conversion events.
4. **Ongoing:** P3 library diet, P8 refactor, U3 a11y pass, U5 agent config, U6 feature ideas.
