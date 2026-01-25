import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..');
const PLAYBOOK_PATH = path.join(WORKSPACE_ROOT, 'easters_ai_v1', 'cma_playbook.md');

const RAG_BASE = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

async function run() {
  if (!fs.existsSync(PLAYBOOK_PATH)) {
    throw new Error(`Playbook not found: ${PLAYBOOK_PATH}`);
  }

  const text = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
  if (!text || text.trim().length < 200) {
    throw new Error('Playbook text too short');
  }

  const res = await fetch(`${RAG_BASE}/cma/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'CMA_PLAYBOOK', kind: 'playbook', text }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Ingest failed (${res.status}): ${body.slice(0, 400)}`);
  }

  console.log('[CMA_PLAYBOOK] Ingested OK:', body);
}

run().catch((e) => {
  console.error('[CMA_PLAYBOOK] Fatal:', e);
  process.exit(1);
});
