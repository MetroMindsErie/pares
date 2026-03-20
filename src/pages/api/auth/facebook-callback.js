export default function handler() {
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const runtime = 'edge';
