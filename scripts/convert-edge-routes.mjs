/**
 * Wrap Next.js Pages Router API routes with edgeHandler utility
 * so Node.js-style (req, res) handlers work under edge runtime.
 *
 * Run: node scripts/convert-edge-routes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Files already manually converted — skip them
const SKIP = new Set([
  'src/pages/api/biggerpockets.js',
  'src/pages/api/trestle/[...path].js',
  'src/pages/api/property-cache/index.js',
]);

function findEdgeRoutes(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEdgeRoutes(full));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
      const rel = path.relative(root, full);
      if (SKIP.has(rel)) continue;
      const content = fs.readFileSync(full, 'utf-8');
      if (
        (content.includes("export const runtime = 'edge'") ||
          content.includes('export const runtime = "edge"')) &&
        (content.includes('res.status') ||
          content.includes('res.json') ||
          content.includes('res.send') ||
          content.includes('res.setHeader') ||
          content.includes('res.end') ||
          content.includes('res.redirect'))
      ) {
        // Check it's not already wrapped
        if (!content.includes('edgeHandler')) {
          results.push(full);
        }
      }
    }
  }
  return results;
}

function computeRelativeImport(filePath) {
  const fileDir = path.dirname(filePath);
  const libDir = path.join(root, 'src', 'lib');
  let rel = path.relative(fileDir, libDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel + '/edgeHandler';
}

function wrapFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const rel = path.relative(root, filePath);

  const importPath = computeRelativeImport(filePath);

  // Add the import at the top (after any existing imports, or at the very top)
  const importLine = `import { edgeHandler } from '${importPath}';\n`;

  // Find where to insert — after the last import statement
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s/) || lines[i].match(/^import\s*{/)) {
      // Find the closing of this import (may span multiple lines)
      let j = i;
      while (j < lines.length && !lines[j].includes(';') && !lines[j].match(/['"];\s*$/)) {
        j++;
      }
      lastImportIdx = j;
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }
  content = lines.join('\n');

  // Wrap the handler:
  // Pattern 1: export default async function handler(req, res) {
  content = content.replace(
    /export default async function handler\s*\(\s*req\s*,\s*res\s*\)/,
    'export default edgeHandler(async function handler(req, res)'
  );
  // Pattern 2: export default function handler(req, res) {  (no async)
  content = content.replace(
    /export default function handler\s*\(\s*req\s*,\s*res\s*\)/,
    'export default edgeHandler(function handler(req, res)'
  );
  // Pattern 3: export default async function handler(req) {  (only req — already partially converted)
  // Skip these — they might already return Response.

  // Close the wrapping ) before the runtime export
  // Find `export const runtime` and add closing `)` before it
  content = content.replace(
    /\n(export const runtime\s*=)/,
    '\n);\n\n$1'
  );

  // But we need to make sure the function body closing brace is NOT doubled.
  // The pattern is: last `}` of the function → `);\n\nexport const runtime`
  // Since we already added the `)` before the runtime export, we need to check
  // that the closing `}` of the function is on the line right before.
  // Actually the replace above should work — the function ends with `}\n\n` and
  // our replace turns `\nexport const runtime` into `\n);\n\nexport const runtime`.

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${rel}`);
}

const apiDir = path.join(root, 'src', 'pages', 'api');
const files = findEdgeRoutes(apiDir);

console.log(`Found ${files.length} edge API routes to wrap:\n`);

for (const f of files) {
  try {
    wrapFile(f);
  } catch (err) {
    console.error(`  ❌ ${path.relative(root, f)}: ${err.message}`);
  }
}

console.log('\nDone!');
