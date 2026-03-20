/**
 * Wraps a classic Next.js Pages-Router API handler (req, res) ⇒ …
 * so it works correctly under `export const runtime = 'edge'`.
 *
 * Usage:
 *   import { edgeHandler } from '../../lib/edgeHandler';
 *   export default edgeHandler(async (req, res) => { … });
 *   export const runtime = 'edge';
 *
 * The adapter creates a lightweight `req`/`res` shim on top of the
 * Web Request/Response objects so existing handler code keeps working.
 */

export function edgeHandler(fn) {
  return async function handler(request) {
    const url = new URL(request.url, 'http://localhost');

    // --- build `req` shim ---------------------------------------------------
    const query = Object.fromEntries(url.searchParams.entries());

    // Try to extract dynamic route params from Next.js (edge runtime provides them
    // on `request.nextUrl.searchParams` in some versions). For [...path] catch-all
    // routes the param is already on the search params.
    // But for [identifier] etc. Next.js rewrites populate the URL path — we pull
    // from the search params where Next.js places them.

    let body = undefined;
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        if (ct.includes('application/json')) {
          body = await request.json();
        } else if (ct.includes('multipart/form-data')) {
          // Keep the raw request for multipart — callers can use request.formData()
          body = request;
        } else if (ct.includes('application/x-www-form-urlencoded')) {
          const text = await request.text();
          body = Object.fromEntries(new URLSearchParams(text).entries());
        } else {
          // Try json, fallback to text
          const text = await request.text();
          try { body = JSON.parse(text); } catch { body = text; }
        }
      } catch {
        body = undefined;
      }
    }

    // Parse cookies from header
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach(pair => {
        const [k, ...v] = pair.trim().split('=');
        if (k) cookies[k.trim()] = decodeURIComponent(v.join('='));
      });
    }

    // Build a plain-object headers map (lowercase keys) for backward compat
    const headersObj = {};
    request.headers.forEach((v, k) => { headersObj[k] = v; });

    const req = {
      method: request.method,
      url: request.url,
      query,
      body,
      headers: headersObj,
      cookies,
      // Keep the original Web Request accessible
      _raw: request,
    };

    // --- build `res` shim ---------------------------------------------------
    let _status = 200;
    const _headers = new Headers({ 'Content-Type': 'application/json' });
    let _body = null;
    let _resolved = false;
    let _resolve;
    const _done = new Promise(r => { _resolve = r; });

    function finish(responseBody) {
      if (_resolved) return;
      _resolved = true;
      _resolve(new Response(responseBody, { status: _status, headers: _headers }));
    }

    const res = {
      status(code) {
        _status = code;
        return res;
      },
      json(data) {
        _headers.set('Content-Type', 'application/json');
        finish(JSON.stringify(data));
        return res;
      },
      send(data) {
        if (typeof data === 'string') {
          if (!_headers.has('Content-Type') || _headers.get('Content-Type') === 'application/json') {
            _headers.set('Content-Type', 'text/plain');
          }
          finish(data);
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          finish(data);
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(data)) {
          finish(new Uint8Array(data));
        } else {
          finish(String(data));
        }
        return res;
      },
      end(data) {
        if (data !== undefined && data !== null) {
          finish(typeof data === 'string' ? data : String(data));
        } else {
          finish(null);
        }
        return res;
      },
      setHeader(key, value) {
        if (Array.isArray(value)) {
          value.forEach(v => _headers.append(key, v));
        } else {
          _headers.set(key, String(value));
        }
        return res;
      },
      redirect(statusOrUrl, maybeUrl) {
        const location = maybeUrl ?? statusOrUrl;
        const code = maybeUrl ? statusOrUrl : 302;
        _status = code;
        _headers.set('Location', location);
        finish(null);
        return res;
      },
    };

    try {
      const result = fn(req, res);
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (err) {
      if (!_resolved) {
        _status = 500;
        _headers.set('Content-Type', 'application/json');
        finish(JSON.stringify({ error: 'Internal server error' }));
      }
    }

    // If the handler never called any res method (shouldn't happen), resolve anyway.
    if (!_resolved) {
      finish(JSON.stringify({ error: 'No response sent' }));
    }

    return _done;
  };
}
