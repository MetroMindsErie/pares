import supabase from '../lib/supabase-setup';

async function updateBehaviorProfile(userId) {
  if (!userId) return;
  try {
    await supabase.rpc('update_user_behavior_profile', { p_user_id: userId });
  } catch (e) {
    console.warn('updateBehaviorProfile failed', e.message);
  }
}

/**
 * Upsert a property view (one row per user/listing_key; updates timestamp on repeat view)
 */
export async function logPropertyView(userId, property) {
  if (!userId || !property?.ListingKey) return;
  const payload = {
    user_id: userId,
    listing_key: property.ListingKey,
    price: property.ListPrice ?? property.ClosePrice ?? null,
    status: property.StandardStatus || null,
    city: property.City || null,
    state: property.StateOrProvince || null,
    bedrooms: property.BedroomsTotal ?? null,
    bathrooms: property.BathroomsTotalInteger ?? null,
    sqft: property.LivingArea ?? null,
    extras: {
      lotSize: property.LotSizeArea || null,
      propertyType: property.PropertyType || null,
      originalListPrice: property.OriginalListPrice || null,
      closePrice: property.ClosePrice || null,
      closeDate: property.CloseDate || null
    }
  };
  try {
    await supabase
      .from('user_property_views')
      .upsert(payload, { onConflict: 'user_id,listing_key' });
  } catch (e) {
    console.warn('logPropertyView failed', e.message);
  }
  updateBehaviorProfile(userId);
}

/**
 * Log search query and criteria
 */
export async function logSearchQuery(userId, criteria, resultsCount) {
  if (!criteria) return;
  const row = {
    user_id: userId || null,
    query_params: criteria,
    raw_location: criteria.location || null,
    status: criteria.status || null,
    min_price: parseInt(criteria.minPrice || '') || null,
    max_price: parseInt(criteria.maxPrice || '') || null,
    beds: parseInt(criteria.beds || '') || null,
    baths: parseInt(criteria.baths || '') || null,
    property_type: criteria.propertyType || null,
    min_sq_ft: parseInt(criteria.minSqFt || '') || null,
    max_sq_ft: parseInt(criteria.maxSqFt || '') || null,
    sold_within: parseInt(criteria.soldWithin || '') || null,
    results_count: resultsCount ?? null
  };
  try {
    await supabase.from('user_search_queries').insert(row);
  } catch (e) {
    console.warn('logSearchQuery failed', e.message);
  }
  updateBehaviorProfile(userId);
}
