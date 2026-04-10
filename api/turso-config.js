export default function handler(req, res) {
  const url   = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'TURSO_URL and TURSO_TOKEN env vars not set' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ url, token });
}
