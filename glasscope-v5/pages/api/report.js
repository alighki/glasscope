import { Reports } from '../../lib/store.js';

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'GET') {
    const report = Reports.get(id);
    if (!report) return res.status(404).json({ error: 'گزارش یافت نشد' });
    return res.status(200).json(report);
  }
  if (req.method === 'PATCH') {
    const { isPublic } = req.body;
    const report = Reports.get(id);
    if (!report) return res.status(404).json({ error: 'گزارش یافت نشد' });
    Reports.save(id, { ...report, public: isPublic });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
