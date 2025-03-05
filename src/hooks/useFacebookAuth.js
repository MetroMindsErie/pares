import { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for extraction of tokens only (client-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function useFacebookAuth() {
  const router = useRouter();
  
  // This effect runs when the component mounts and extracts Facebook token from URL hash
  useEffect(() => {
    const extractAndSaveFacebookToken = async () => {
      // Check if we have a hash in the URL (sign of OAuth redirect)
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('Found access_token in URL hash, extracting...');
        
        // Parse hash params
        const hashParams = {};
        window.location.hash.substring(1).split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          hashParams[key] = decodeURIComponent(value);
        });
        
        // Extract tokens
        const accessToken = hashParams.access_token;
        const providerToken = hashParams.provider_token;
        
        if (accessToken && providerToken) {
          console.log('Found both access and provider tokens');
          
          try {
            // Get current session to extract user ID
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user?.id) {
              console.log('User is authenticated, saving Facebook token...');
              
              // Call API to store the token
              await axios.post('/api/auth/facebook-token', {
                user_id: session.user.id,
                provider_token: providerToken,
                supabase_token: accessToken
              });
              
              console.log('Facebook token saved successfully');
            } else {
              console.log('No active session found when extracting token');
            }
          } catch (err) {
            console.error('Error saving extracted Facebook token:', err);
          }
        }
        
        // Clear the hash to avoid processing it again
        if (window.history.replaceState) {
          window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
      }
    };
    
    extractAndSaveFacebookToken();
  }, []);
  
  return null;
}
