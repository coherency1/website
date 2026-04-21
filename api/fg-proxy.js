export default async function handler(req, res) {
  const { gamedate } = req.query;
  if (!gamedate) return res.status(400).json({ error: 'gamedate required' });
  const url = `https://www.fangraphs.com/api/scores/live-all?gamedate=${gamedate}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return res.status(r.status).json({ error: 'upstream error' });
  const data = await r.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  res.json(data);
}
