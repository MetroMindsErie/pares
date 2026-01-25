const RAG_BASE = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

async function run() {
  const body = {
    query: 'CMA methodology for selecting comps and adjusting price',
    listings: [
      {
        id: 'smoke-1',
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
        id: 'smoke-2',
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
    ],
  };

  const url = `${RAG_BASE}/debug/phase2/smoke`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Smoke failed (${res.status}): ${text.slice(0, 800)}`);
  }

  console.log('[PHASE2_SMOKE] OK:', text);
  console.log('[PHASE2_SMOKE] Tip: run it twice; second call should be faster.');
}

run().catch((e) => {
  console.error('[PHASE2_SMOKE] Fatal:', e);
  process.exit(1);
});
