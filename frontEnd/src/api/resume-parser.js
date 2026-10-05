// Production proxy, written for Vercel serverless functions (put it at /api/resume-parser.js).
// For another host (Netlify, Express, your own backend) the logic is the same: read the raw
// request body, forward it to APILayer with the key from the environment, return the JSON.
export const config = { api: { bodyParser: false } };

const MAX_BYTES = 5 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.APILAYER_RESUME_KEY) return res.status(500).json({ error: 'Parser is not configured' });

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) return res.status(413).json({ error: 'File too large' });
    chunks.push(chunk);
  }

  try {
    const upstream = await fetch('https://api.apilayer.com/resume_parser/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', apikey: process.env.APILAYER_RESUME_KEY },
      body: Buffer.concat(chunks),
    });
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(await upstream.text());
  } catch {
    res.status(502).json({ error: 'Could not reach the resume service' });
  }
}
