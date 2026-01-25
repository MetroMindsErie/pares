const RAG_BASE = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

async function run() {
  const listings = [
    {
      id: 'deal-1',
      address: '123 Main St',
      city: 'Erie',
      county: 'Erie',
      state: 'PA',
      zip: '16501',
      price: 199000,
      beds: 3,
      baths: 2,
      sqft: 1500,
      status: 'active',
      property_type: 'Single Family',
      summary: 'Move-in ready. Great rental potential.',
    },
    {
      id: 'deal-2',
      address: '456 Pine Ave',
      city: 'Erie',
      county: 'Erie',
      state: 'PA',
      zip: '16502',
      price: 275000,
      beds: 4,
      baths: 2,
      sqft: 2100,
      status: 'active',
      property_type: 'Single Family',
      summary: 'Recently renovated, higher-end finishes.',
    },
    {
      id: 'deal-3',
      address: '789 Walnut St',
      city: 'Erie',
      county: 'Erie',
      state: 'PA',
      zip: '16502',
      price: 340000,
      beds: 4,
      baths: 3,
      sqft: 2600,
      status: 'active',
      property_type: 'Single Family',
      summary: 'Premium price; updated but smaller lot.',
    },
  ];

  const res = await fetch(`${RAG_BASE}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Find a good investment deal in Erie with strong rental potential',
      role: 'investor',
      listings,
      retrieval_notes: ['phase3-smoke'],
      retrieval_attempt: 'phase3-smoke',
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Explain failed (${res.status}): ${JSON.stringify(json)?.slice(0, 900)}`);
  }

  const top = Array.isArray(json?.listings) ? json.listings[0] : null;

  console.log('[PHASE3_SMOKE] top-level deal_score:', json?.deal_score);
  console.log('[PHASE3_SMOKE] top-level suggested_offer:', json?.suggested_offer);
  console.log('[PHASE3_SMOKE] top listing id:', top?.id);
  console.log('[PHASE3_SMOKE] top listing deal_score:', top?.deal_score);
  console.log('[PHASE3_SMOKE] top listing suggested_offer:', top?.suggested_offer);
  console.log('[PHASE3_SMOKE] top listing factors:', top?.deal_factors);
}

run().catch((e) => {
  console.error('[PHASE3_SMOKE] Fatal:', e);
  process.exit(1);
});
