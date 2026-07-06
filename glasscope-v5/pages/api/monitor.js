// ══ Monitor API — Website Health Tracking ════════════════════════
import { Monitors, Usage, Cache } from '../../lib/store.js';
import { crawlMultiPage } from '../../lib/crawler.js';
import { runRuleEngine } from '../../lib/ruleEngine.js';
import * as cheerio from 'cheerio';
import { validateURL } from '../../lib/ssrf.js';

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const userId = req.headers['x-user-id'] || ip;

  if (req.method === 'GET') {
    // List monitors for user
    const monitors = Monitors.getByUser(userId);
    const withHistory = monitors.map(m => ({
      ...m,
      history: Monitors.getHistory(m.id, 10),
      alerts: Monitors.detectChanges(m.id),
    }));
    return res.status(200).json({ monitors: withHistory });
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    // Add monitor
    if (action === 'add') {
      let { url, schedule = 'weekly', label } = req.body;
      if (!url) return res.status(400).json({ error: 'URL وارد نشده' });
      try { url = await validateURL(url.startsWith('http') ? url : 'https://' + url); } catch(e) { return res.status(400).json({ error: e.message }); }

      const existing = Monitors.getByUser(userId);
      if (existing.length >= 5) return res.status(403).json({ error: 'حداکثر ۵ سایت قابل مانیتور است' });

      const monitor = Monitors.create({ userId, url, schedule, label: label || url.replace(/https?:\/\//,'').split('/')[0], lastScore: null, scores: {} });
      return res.status(200).json({ monitor });
    }

    // Delete monitor
    if (action === 'delete') {
      const { monitorId } = req.body;
      Monitors.delete(monitorId);
      return res.status(200).json({ ok: true });
    }

    // Manual check (trigger a new analysis)
    if (action === 'check') {
      const { monitorId } = req.body;
      const monitor = Monitors.get(monitorId);
      if (!monitor) return res.status(404).json({ error: 'مانیتور یافت نشد' });
      if (monitor.userId !== userId) return res.status(403).json({ error: 'دسترسی ندارید' });

      try { Usage.increment(`monitor_check:${userId}`, 3600000, 10); } catch(e) { return res.status(429).json({ error: e.message }); }

      try {
        const crawl = await crawlMultiPage(monitor.url, 1);
        const main = crawl.mainPage;
        const $ = main.$;
        const rule = runRuleEngine({ html: main.html, $, headers: main.headers || {}, url: monitor.url, resources: main.resources || {}, loadTime: main.loadTime || 0, webVitals: main.webVitals || {} });

        const entry = { scores: rule.scores, finalScore: rule.finalScore, criticalCount: rule.allEvidence.filter(e=>e.severity==='critical').length, issues: rule.allEvidence.slice(0,5), webVitals: main.webVitals || null };
        Monitors.addHistory(monitorId, entry);
        Monitors.update(monitorId, { lastChecked: new Date().toISOString(), lastScore: rule.finalScore, scores: rule.scores });

        const alerts = Monitors.detectChanges(monitorId);
        return res.status(200).json({ ok: true, score: rule.finalScore, alerts, entry });
      } catch(e) {
        return res.status(500).json({ error: e.message });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
