export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { report } = req.body;
  if (!report) return res.status(400).json({ error: 'گزارشی وجود ندارد' });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=glasscope-${Date.now()}.json`);
  return res.status(200).json(report);
}
