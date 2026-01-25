import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

function nowIso() {
  return new Date().toISOString();
}

function scrubSecrets(text) {
  if (!text) return text;
  let out = String(text);

  // Authorization headers / bearer tokens
  out = out.replace(/(Authorization:\s*Bearer\s+)([^\s\r\n]+)/gi, '$1***');
  out = out.replace(/(Bearer\s+)([A-Za-z0-9\-_.~+/]+=*)/g, '$1***');

  // Common query-string secrets
  out = out.replace(/(client_secret=)([^&\s]+)/gi, '$1***');
  out = out.replace(/(SUPABASE_DB_PASSWORD=)([^\s]+)/gi, '$1***');

  // Generic env var patterns
  out = out.replace(/(NEXT_PUBLIC_TRESTLE_CLIENT_SECRET\s*[:=]\s*)(.+)/gi, '$1***');
  out = out.replace(/(TRESTLE_CLIENT_SECRET\s*[:=]\s*)(.+)/gi, '$1***');

  return out;
}

function toLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
}

function tailLines(text, maxLines = 400) {
  const lines = toLines(text);
  if (lines.length <= maxLines) return lines;
  return lines.slice(lines.length - maxLines);
}

async function readOptionalFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function findApiContainerName() {
  const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}']);
  const names = toLines(stdout);

  // Prefer the known compose container name first.
  const preferred = ['pa-real-estate-api', 'easters_ai_v1-api', 'api'];
  for (const p of preferred) {
    const exact = names.find((n) => n === p);
    if (exact) return exact;
  }

  // Fallback: find something that looks like the API container.
  const fuzzy = names.find((n) => /api/i.test(n) && /real-estate|easters|rag/i.test(n));
  return fuzzy || null;
}

async function getDockerLogs(containerName, maxLines = 400) {
  if (!containerName) {
    return { containerName: null, raw: null, lines: [] };
  }

  try {
    const { stdout, stderr } = await execFileAsync('docker', [
      'logs',
      '--tail',
      String(maxLines),
      containerName
    ]);

    // Some docker log output ends up in stderr depending on config; keep both.
    const raw = [stdout, stderr].filter(Boolean).join('');
    const scrubbed = scrubSecrets(raw);
    return {
      containerName,
      raw: scrubbed,
      lines: tailLines(scrubbed, maxLines)
    };
  } catch (e) {
    return {
      containerName,
      raw: scrubSecrets(e?.message || String(e)),
      lines: tailLines(scrubSecrets(e?.message || String(e)), maxLines)
    };
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const outPath = process.env.DEV_CONTEXT_LOG_PATH || 'DEV_CONTEXT_LOG.json';

  const paresLogPath = process.env.PARES_DEV_LOG_PATH || '/tmp/pares-dev.log';
  const maxLines = Number(process.env.DEV_CONTEXT_MAX_LINES || 400);

  const paresRaw = await readOptionalFile(paresLogPath);
  const paresScrubbed = paresRaw ? scrubSecrets(paresRaw) : null;

  const apiContainerName = await findApiContainerName();
  const api = await getDockerLogs(apiContainerName, maxLines);

  const payload = {
    generatedAt: nowIso(),
    cwd: process.cwd(),
    sources: {
      paresDevLogPath: paresLogPath,
      apiContainerName: apiContainerName
    },
    pares: {
      available: Boolean(paresScrubbed),
      lines: paresScrubbed ? tailLines(paresScrubbed, maxLines) : [],
    },
    api: {
      available: Boolean(api.raw),
      lines: api.lines
    }
  };

  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  if (!args.has('--quiet')) {
    console.log(`Wrote ${outPath}`);
    console.log(`- pares lines: ${payload.pares.lines.length} (from ${paresLogPath})`);
    console.log(`- api lines:   ${payload.api.lines.length} (from ${apiContainerName || 'N/A'})`);
  }
}

main().catch((err) => {
  console.error('capture-dev-context failed:', err);
  process.exit(1);
});
