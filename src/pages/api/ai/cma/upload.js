import { edgeHandler } from '../../../../lib/edgeHandler';

export const config = {
  api: {
    bodyParser: false,
  },
};

function json(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Parse a multipart file upload using the Web FormData API.
 * Works on edge runtime (no filesystem / formidable needed).
 */
async function parseMultipart(req) {
  // If the raw Web Request is available (via edgeHandler shim), use it directly
  if (req._raw && typeof req._raw.formData === 'function') {
    return await req._raw.formData();
  }
  // Fallback: Build a web-standard Request so we can call .formData()
  const headers = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (typeof v === 'string') headers[k] = v;
  }
  const webReq = new Request('https://localhost', {
    method: 'POST',
    headers,
    body: req.body || req,
  });
  const formData = await webReq.formData();
  return formData;
}

async function readFileAsText(file) {
  const originalName = String(file?.name || '').toLowerCase();
  const mime = String(file?.type || '').toLowerCase();

  if (
    originalName.endsWith('.txt') ||
    originalName.endsWith('.md') ||
    originalName.endsWith('.json') ||
    mime.includes('text/') ||
    mime.includes('application/json')
  ) {
    return await file.text();
  }

  if (originalName.endsWith('.pdf') || mime.includes('pdf')) {
    let pdfParse;
    try {
      // Use indirect import to prevent webpack static analysis in edge builds
      const mod = 'pdf-parse';
      pdfParse = (await import(/* webpackIgnore: true */ mod)).default;
    } catch {
      throw new Error('PDF parsing not available. Install pdf-parse or upload a .txt/.md file.');
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    return String(parsed?.text || '');
  }

  throw new Error(`Unsupported CMA file type: ${originalName || mime || 'unknown'}`);
}

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return json(res, 405, { error: 'Method not allowed' });
  }

  const ragBase = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

  try {
    const formData = await parseMultipart(req);
    const file = formData.get('file');
    if (!file || typeof file === 'string') return json(res, 400, { error: 'Missing file (form field: file)' });

    const text = await readFileAsText(file);
    const nameField = formData.get('name');
    const name = String(nameField || file?.name || 'CMA');

    if (!text || text.trim().length < 50) {
      return json(res, 400, { error: 'CMA text too short after parsing. Try a different file.' });
    }

    const upstream = await fetch(`${ragBase}/cma/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, text }),
    });

    const upstreamText = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(upstreamText);
  } catch (e) {
    return json(res, 500, { error: 'CMA upload failed', details: e?.message || String(e) });
  }
}

);

export const runtime = 'edge';
