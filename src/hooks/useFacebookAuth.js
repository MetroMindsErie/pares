import { useEffect, useState } from 'react';
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
  const [processing, setProcessing] = useState(false);
  
  // This effect runs when the component mounts and extracts Facebook token from URL hash
  useEffect(() => {
    const extractAndSaveFacebookToken = async () => {
      // Only process if not already processing
      if (processing) return;
      
      // Check if we have a hash in the URL (sign of OAuth redirect)
      if (window.location.hash && (
          window.location.hash.includes('access_token') || 
          window.location.hash.includes('provider_token')
        )) {
        setProcessing(true);

        
        try {
          // Parse hash params
          const hashParams = {};
          window.location.hash.substring(1).split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            hashParams[key] = decodeURIComponent(value);
          });
          
          // Extract tokens
          const accessToken = hashParams.access_token;
          const providerToken = hashParams.provider_token;
          
          if (accessToken || providerToken) {

            
            // Store in localStorage for potential future use (will be cleared later)
            if (providerToken) localStorage.setItem('provider_token', providerToken);
            if (accessToken) localStorage.setItem('access_token', accessToken);
            
            try {
              // Get current session to extract user ID
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.user?.id) {

                
                // Call API to store the token
                await axios.post('/api/auth/store-facebook-token', {
                  user_id: session.user.id,
                  access_token: providerToken || accessToken,
                  provider_user_id: session.user.identities?.find(i => i.provider === 'facebook')?.id
                });
                

                
                // Clear the hash to avoid processing it again
                setTimeout(() => {
                  // Clear stored tokens after use for security
                  localStorage.removeItem('provider_token');
                  localStorage.removeItem('access_token');
                }, 5000);
              } else {

              }
            } catch (err) {
              console.error('Error saving extracted Facebook token:', err);
            }
          }
          
          // Clear the hash to avoid processing it again
          if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
          }
        } catch (err) {
          console.error('Error processing hash params:', err);
        } finally {
          setProcessing(false);
        }
      }
    };
    
    // Small timeout to ensure URL is fully processed by the browser
    setTimeout(extractAndSaveFacebookToken, 300);
  }, [router]);
  
  return { processing };
}
