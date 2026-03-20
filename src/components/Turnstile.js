import { useEffect, useRef, useCallback, useState } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let _scriptLoading = null;

function loadScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (document.getElementById(SCRIPT_ID)) {
    return window.turnstile
      ? Promise.resolve()
      : (_scriptLoading ??= new Promise((resolve) => {
          const check = () => (window.turnstile ? resolve() : setTimeout(check, 50));
          check();
        }));
  }
  _scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const check = () => (window.turnstile ? resolve() : setTimeout(check, 50));
      check();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _scriptLoading;
}

/**
 * Cloudflare Turnstile widget.
 *
 * Props:
 *  - onVerify(token)   called with the verification token
 *  - onExpire()        optional, called when the token expires
 *  - onError(err)      optional
 *  - theme             'light' | 'dark' | 'auto' (default 'auto')
 *  - size              'normal' | 'compact' (default 'normal')
 *  - className         optional wrapper className
 *
 * If NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set the widget renders nothing
 * and calls onVerify('__dev_bypass__') immediately so forms still work in dev.
 */
export default function Turnstile({ onVerify, onExpire, onError, theme = 'auto', size = 'normal', className = '' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [siteKey] = useState(() => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '');

  const handleVerify = useCallback((token) => { onVerify?.(token); }, [onVerify]);
  const handleExpire = useCallback(() => { onExpire?.(); onVerify?.(''); }, [onExpire, onVerify]);
  const handleError = useCallback((err) => { onError?.(err); onVerify?.(''); }, [onError, onVerify]);

  useEffect(() => {
    if (!siteKey) {
      // No key configured — bypass for local dev
      onVerify?.('__dev_bypass__');
      return;
    }

    let cancelled = false;

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;

      // Remove any previously rendered widget in this container
      if (widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: handleVerify,
        'expired-callback': handleExpire,
        'error-callback': handleError,
      });
    }).catch((err) => {
      console.error('Failed to load Turnstile script', err);
      handleError?.(err);
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size, handleVerify, handleExpire, handleError]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}
