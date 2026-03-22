import { createClient } from '@supabase/supabase-js';
import { edgeHandler } from '../../lib/edgeHandler';
import { enforceRiskBasedTurnstile } from '../../lib/security/turnstile';

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, propertyUrl, agentEmail, turnstileToken } = req.body || {};

  const security = await enforceRiskBasedTurnstile({
    req,
    res,
    pathname: '/api/contact',
    token: turnstileToken,
  });
  if (!security.ok) return security.response;

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.from('contact_messages').insert({
      agent_email: agentEmail || 'easterjo106@yahoo.com',
      sender_name: (name || '').trim() || null,
      sender_email: (email || '').trim() || null,
      property_url: (propertyUrl || '').trim() || null,
      message: message.trim(),
    });

    if (error) {
      console.error('Contact insert error:', error);
      return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }

    return res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export const runtime = 'edge';
