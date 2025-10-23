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


  
  // Check Trestle variables

  let allTrestleVarsPresent = true;
  trestleVars.forEach(varName => {
    const isPresent = !!process.env[varName];

    if (!isPresent) allTrestleVarsPresent = false;
  });

  // Check Supabase variables

  let allSupabaseVarsPresent = true;
  supabaseVars.forEach(varName => {
    const isPresent = !!process.env[varName];

    if (!isPresent) allSupabaseVarsPresent = false;
  });






  return {
    trestleConfigValid: allTrestleVarsPresent,
    supabaseConfigValid: allSupabaseVarsPresent,
    allValid: allTrestleVarsPresent && allSupabaseVarsPresent
  };
}

export default validateEnvironmentVariables;
