import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..');
const PROMPTS_PATH = path.join(WORKSPACE_ROOT, 'easters_ai_v1', 'testprompts.txt');
const REPORT_PATH = path.join(process.cwd(), 'AI_SMOKE_REPORT.json');

const BASE_URL = process.env.AI_SMOKE_BASE_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/ai/search`;

function normalizeRoleLabel(roleLabel) {
  const r = String(roleLabel || '').trim().toLowerCase();
  if (r === 'buyer' || r === 'seller' || r === 'investor' || r === 'realtor') return r;
  return null;
}

function extractQueryText(raw) {
  // Handles curly quotes, straight quotes, and cases with trailing notes.
  const line = String(raw || '').trim();
  if (!line) return null;

  // Prefer content inside quotes.
  const quoted = line.match(/^[^:]+:\s*[“"]([^”"]+)[”"]/);
  if (quoted && quoted[1]) return quoted[1].trim();

  // Fallback: take text after colon and strip any parenthetical note.
  const parts = line.split(':');
  if (parts.length < 2) return null;
  return parts
    .slice(1)
    .join(':')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^[“"]/, '')
    .replace(/[”"]$/, '')
    .trim();
}

function parsePromptsFile(text) {
  const cases = [];
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const roleLabel = line.split(':')[0];
    const role = normalizeRoleLabel(roleLabel);
    if (!role) continue;
    const query = extractQueryText(line);
    if (!query) continue;
    cases.push({ role, query, sourceLine: line });
  }

  return cases;
}

function validateResponseShape(json) {
  const errors = [];
  if (!json || typeof json !== 'object') errors.push('Response is not a JSON object');
  if (!('answer' in json)) errors.push('Missing answer');
  if (!Array.isArray(json?.listings)) errors.push('Missing listings[]');
  if (!Array.isArray(json?.reasoning)) errors.push('Missing reasoning[]');
  return errors;
}

function hasRelaxationNotes(json) {
  return Array.isArray(json?.reasoning) && json.reasoning.some((r) => typeof r === 'string' && r.startsWith('Relaxed search:'));
}

async function run() {
  if (!fs.existsSync(PROMPTS_PATH)) {
    throw new Error(`Prompts file not found: ${PROMPTS_PATH}`);
  }

  const promptsText = fs.readFileSync(PROMPTS_PATH, 'utf8');
  const cases = parsePromptsFile(promptsText);

  const startedAt = new Date().toISOString();
  const results = [];

  for (const testCase of cases) {
    const started = Date.now();
    const payload = { query: testCase.query, role: testCase.role };

    let status = null;
    let ok = false;
    let json = null;
    let text = null;
    let error = null;

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      status = res.status;
      ok = res.ok;
      text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (!res.ok) {
        error = `HTTP ${res.status}: ${String(text || '').slice(0, 200)}`;
      }
    } catch (e) {
      error = e?.message || String(e);
    }

    const durationMs = Date.now() - started;

    const validationErrors = ok ? validateResponseShape(json) : [];

    // Minimal expectations (avoid brittle assertions against live inventory).
    // We only enforce a couple of “behavioral” invariants that should stay stable.
    const expectations = [];

    if (/cash flowing multifamily in area 5 under 250k/i.test(testCase.query)) {
      expectations.push({
        name: 'Should disclose relaxation when area+income yields 0',
        pass: hasRelaxationNotes(json),
        details: 'Expected reasoning to include at least one "Relaxed search:" note',
      });
      expectations.push({
        name: 'Should return some alternatives (not 0)',
        pass: Array.isArray(json?.listings) && json.listings.length > 0,
        details: 'Expected listings.length > 0 due to transparent relaxation fallback',
      });
    }

    // Explicit single-family purchase intent should not drift into land/commercial.
    if (/single family rental under 200k/i.test(testCase.query)) {
      const badType = Array.isArray(json?.listings)
        ? json.listings.some((l) => ['Land', 'CommercialSale', 'CommercialLease'].includes(String(l?.property_type || '')))
        : false;
      expectations.push({
        name: 'Single-family intent should stay Residential',
        pass: ok ? !badType : true,
        details: 'Expected no Land/Commercial* listings in results',
      });
    }

    const expectationsFailed = expectations.filter((e) => e.pass === false);

    results.push({
      role: testCase.role,
      query: testCase.query,
      sourceLine: testCase.sourceLine,
      endpoint: ENDPOINT,
      status,
      ok,
      durationMs,
      resultsCount: Array.isArray(json?.listings) ? json.listings.length : null,
      hasRelaxationNotes: hasRelaxationNotes(json),
      validationErrors,
      expectations,
      expectationsFailed,
      error,
    });

    const lineStatus = ok && validationErrors.length === 0 && expectationsFailed.length === 0 ? 'PASS' : 'FAIL';
    console.log(`[AI_SMOKE] ${lineStatus} (${durationMs}ms) [${testCase.role}] ${testCase.query}`);
    if (lineStatus === 'FAIL') {
      if (error) console.log(`  error: ${error}`);
      if (validationErrors.length) console.log(`  validation: ${validationErrors.join('; ')}`);
      if (expectationsFailed.length) console.log(`  expectations: ${expectationsFailed.map((x) => x.name).join('; ')}`);
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.ok && r.validationErrors.length === 0 && r.expectationsFailed.length === 0).length,
    failed: results.filter((r) => !r.ok || r.validationErrors.length > 0 || r.expectationsFailed.length > 0).length,
  };

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    endpoint: ENDPOINT,
    promptsPath: PROMPTS_PATH,
    reportPath: REPORT_PATH,
    summary,
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n[AI_SMOKE] Wrote report: ${REPORT_PATH}`);
  console.log(`[AI_SMOKE] Summary: ${summary.passed}/${summary.total} passed (${summary.failed} failed)`);

  if (summary.failed > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error('[AI_SMOKE] Fatal:', e);
  process.exit(1);
});
