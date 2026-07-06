import { Promos, Usage } from '../../lib/store.js';

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const userId = req.headers['x-user-id'] || ip;

  if (req.method === 'POST') {
    const { action, code } = req.body;

    if (action === 'redeem') {
      if (!code) return res.status(400).json({ error: 'کد وارد نشده' });
      try { Usage.increment(`promo_attempt:${ip}`, 900000, 5); } catch(e) { return res.status(429).json({ error: 'تلاش زیاد. ۱۵ دقیقه صبر کنید.' }); }
      const result = Promos.redeem(code.trim().toUpperCase(), userId);
      if (!result.success) return res.status(400).json({ error: result.reason });
      return res.status(200).json({ success: true, daysGranted: result.daysGranted, expiry: result.expiry, message: '🎉 یک ماه دسترسی نامحدود فعال شد!' });
    }

    if (action === 'generate') {
      const { targetUserId, campaign } = req.body;
      const { id, code, expiresAt } = Promos.generate(targetUserId || userId, campaign || 'reward');
      return res.status(200).json({ id, code, expiresAt, message: `کد پروموشن برای ${targetUserId || userId} ساخته شد` });
    }
  }

  if (req.method === 'GET') {
    const promos = Promos.getByUser(userId);
    return res.status(200).json({ promos });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
