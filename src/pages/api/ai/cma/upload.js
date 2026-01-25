import formidable from 'formidable';
import fs from 'node:fs';

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

async function readFileAsText(file) {
  const filepath = file?.filepath;
  if (!filepath) return '';

  const originalName = String(file?.originalFilename || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();

  // Basic support: .txt/.md/.json
  if (
    originalName.endsWith('.txt') ||
    originalName.endsWith('.md') ||
    originalName.endsWith('.json') ||
    mime.includes('text/') ||
    mime.includes('application/json')
  ) {
    return fs.readFileSync(filepath, 'utf8');
  }

  // PDF support (optional dependency)
  if (originalName.endsWith('.pdf') || mime.includes('pdf')) {
    let pdfParse;
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch {
      throw new Error('PDF parsing not available. Install pdf-parse or upload a .txt/.md file.');
    }

    const buf = fs.readFileSync(filepath);
    const parsed = await pdfParse(buf);
    return String(parsed?.text || '');
  }

  throw new Error(`Unsupported CMA file type: ${originalName || mime || 'unknown'}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return json(res, 405, { error: 'Method not allowed' });
  }

  const ragBase = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

  try {
    const form = formidable({ multiples: false });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const file = files?.file;
    if (!file) return json(res, 400, { error: 'Missing file (form field: file)' });

    const text = await readFileAsText(file);
    const name = String(fields?.name || file?.originalFilename || 'CMA');

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
