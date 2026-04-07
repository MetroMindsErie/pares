import { createClient } from '@supabase/supabase-js';

const readEnvString = (value, fallback) => {
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim();
  return normalized ? normalized : fallback;
};

const isBrowser = () => typeof window !== 'undefined';

// Fallback values prevent createClient from throwing during build when
// NEXT_PUBLIC_* env vars are not yet available. Real values are used at runtime.
const supabaseUrl = readEnvString(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'https://placeholder.supabase.co'
);
const supabaseAnonKey = readEnvString(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'placeholder-key'
);

let supabaseInstance = null;
let browserListenersAttached = false;

const fetchWithTimeout = (url, options = {}) => {
  const timeout = 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(id));
};

const attachBrowserListeners = (client) => {
  if (!isBrowser() || browserListenersAttached || !client?.auth) return;

  browserListenersAttached = true;

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      try {
        localStorage.removeItem('pares-auth-storage');
        sessionStorage.removeItem('isLoggingOut');
      } catch (e) {
        // Ignore storage errors
      }
    }
  });

  window.addEventListener('load', () => {
    const storageKey = 'pares-auth-storage';
    try {
      const authData = localStorage.getItem(storageKey);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
          console.warn('Clearing expired auth session');
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn('Clearing corrupted auth data');
      localStorage.removeItem(storageKey);
    }
  }, { once: true });
};

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser(),
        autoRefreshToken: isBrowser(),
        detectSessionInUrl: isBrowser(),
        storageKey: 'pares-auth-storage',
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development'
      },
      global: {
        headers: {
          'x-client-info': 'pares-homes'
        },
        fetch: fetchWithTimeout
      }
    });

    attachBrowserListeners(supabaseInstance);
  }

  return supabaseInstance;
};

const supabaseProxy = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default supabaseProxy;
export const supabase = supabaseProxy;
export const supabaseClient = supabaseProxy;

// Helper function to check Supabase client status
export const checkSupabaseClient = () => {
  try {
    const client = getSupabaseClient();

    if (!client) {
      return {
        initialized: false,
        authAvailable: false,
        authMethods: [],
        error: 'Supabase client not initialized'
      };
    }
    
    const authMethods = Object.keys(client.auth || {});
    return {
      initialized: !!client,
      authAvailable: !!client.auth,
      authMethods
    };
  } catch (error) {
    console.error('Error checking Supabase client:', error);
    return {
      initialized: false,
      authAvailable: false,
      authMethods: [],
      error: error.message
    };
  }
};

// Version-agnostic auth methods with better error handling
export const supabaseAuth = {
  getSession: async () => {
    try {
      const client = getSupabaseClient();
      if (!client?.auth) return { data: { session: null }, error: new Error('Supabase auth not available') };
      
      if (typeof client.auth.getSession === 'function') {
        return await client.auth.getSession();
      } else if (typeof client.auth.session === 'function') {
        // Legacy version support
        const session = client.auth.session();
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: new Error('No compatible session method found') };
    } catch (error) {
      console.error('getSession error:', error);
      return { data: { session: null }, error };
    }
  },
  
  signOut: async () => {
    try {
      const client = getSupabaseClient();
      if (!client?.auth) return { error: new Error('Supabase auth not available') };
      
      if (typeof client.auth.signOut === 'function') {
        return await client.auth.signOut({ scope: 'local' });
      }
      return { error: new Error('No compatible signOut method found') };
    } catch (error) {
      console.error('signOut error:', error);
      return { error };
    }
  }
};
