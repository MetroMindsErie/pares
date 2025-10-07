import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    if (error) throw error;
    
    const categories = data.map(row => row.name);
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve categories', categories: [] },
      { status: 500 }
    );
  }
}
