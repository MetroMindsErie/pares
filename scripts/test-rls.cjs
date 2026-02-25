const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY);
const anonSb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  // Get a test user
  const { data, error } = await sb.from('users').select('id, first_name, email, phone').limit(1);
  if (error || !data || !data.length) {
    console.log('No user found:', error);
    process.exit(1);
  }
  const userId = data[0].id;
  console.log('Test user:', data[0].email, userId);

  // Test 1: anon key update (no session) - simulates missing auth
  const r1 = await anonSb.from('users').update({ phone: '555-test-anon' }).eq('id', userId).select();
  console.log('Anon update (no session):', r1.error ? 'BLOCKED: ' + r1.error.message + ' code:' + r1.error.code : 'SUCCESS');
  console.log('  status:', r1.status, 'rows returned:', r1.data ? r1.data.length : 0);

  // Check if the phone was actually changed
  const { data: check1 } = await sb.from('users').select('phone').eq('id', userId).single();
  console.log('  Phone after anon update:', check1.phone);

  // Test 2: service role update (restore original)
  const r2 = await sb.from('users').update({ phone: data[0].phone || '' }).eq('id', userId);
  console.log('Service role update:', r2.error ? 'BLOCKED: ' + r2.error.message : 'SUCCESS');

  // Test 3: Check RLS status
  const { data: rlsData, error: rlsErr } = await sb.rpc('to_regclass', { name: 'users' });
  console.log('RLS check rpc:', rlsData, rlsErr);

  process.exit(0);
})();
