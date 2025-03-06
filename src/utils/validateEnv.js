/**
 * Validates required environment variables and logs status
 */
export function validateEnvironmentVariables() {
  // Trestle API environment variables
  const trestleVars = [
    'NEXT_PUBLIC_TRESTLE_TOKEN_URL',
    'NEXT_PUBLIC_TRESTLE_CLIENT_ID',
    'NEXT_PUBLIC_TRESTLE_CLIENT_SECRET'
  ];

  // Supabase environment variables
  const supabaseVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ];

  console.log('=== Environment Variables Status ===');
  
  // Check Trestle variables
  console.log('Trestle API Configuration:');
  let allTrestleVarsPresent = true;
  trestleVars.forEach(varName => {
    const isPresent = !!process.env[varName];
    console.log(`- ${varName}: ${isPresent ? '✓' : '✗'}`);
    if (!isPresent) allTrestleVarsPresent = false;
  });

  // Check Supabase variables
  console.log('Supabase Configuration:');
  let allSupabaseVarsPresent = true;
  supabaseVars.forEach(varName => {
    const isPresent = !!process.env[varName];
    console.log(`- ${varName}: ${isPresent ? '✓' : '✗'}`);
    if (!isPresent) allSupabaseVarsPresent = false;
  });

  console.log('================================');
  console.log(`Trestle API configuration: ${allTrestleVarsPresent ? 'VALID' : 'INCOMPLETE'}`);
  console.log(`Supabase configuration: ${allSupabaseVarsPresent ? 'VALID' : 'INCOMPLETE'}`);
  console.log('================================');

  return {
    trestleConfigValid: allTrestleVarsPresent,
    supabaseConfigValid: allSupabaseVarsPresent,
    allValid: allTrestleVarsPresent && allSupabaseVarsPresent
  };
}

export default validateEnvironmentVariables;
