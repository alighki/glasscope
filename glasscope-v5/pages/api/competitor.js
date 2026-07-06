import { Competitors, Cache } from '../../lib/store.js';
import { crawlMultiPage } from '../../lib/crawler.js';
import { runRuleEngine } from '../../lib/ruleEngine.js';
import { validateURL } from '../../lib/ssrf.js';

export default async function handler(req, res) {
  const userId = req.headers['x-user-id'] || req.headers['x-forwarded-for']?.split(',')[0] || 'anon';

  if (req.method === 'GET') {
    const comps = Competitors.getByUser(userId);
    return res.status(200).json({ competitors: comps });
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'add') {
      let { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL وارد نشده' });
      try { url = await validateURL(url.startsWith('http') ? url : 'https://' + url); } catch(e) { return res.status(400).json({ error: e.message }); }
      const existing = Competitors.getByUser(userId);
      if (existing.length >= 5) return res.status(403).json({ error: 'حداکثر ۵ رقیب قابل ردیابی است' });
      const comp = Competitors.add(userId, url);
      return res.status(200).json({ competitor: comp });
    }

    if (action === 'analyze') {
      const { competitorId, myUrl } = req.body;
      const comp = Competitors.getByUser(userId).find(c => c.id === competitorId);
      if (!comp) return res.status(404).json({ error: 'رقیب یافت نشد' });

      const cached = Cache.get(`comp:${comp.url}`);
      if (cached) return res.status(200).json(cached);

      try {
        const [myCrawl, compCrawl] = await Promise.allSettled([
          myUrl ? crawlMultiPage(myUrl, 1) : Promise.resolve(null),
          crawlMultiPage(comp.url, 1),
        ]);

        const compCrawlResult = compCrawl.status === 'fulfilled' ? compCrawl.value : null;
        if (!compCrawlResult) return res.status(500).json({ error: 'آنالیز رقیب ناموفق بود' });

        const compMain = compCrawlResult.mainPage;
        const comp$ = compMain.$;
        const compRule = runRuleEngine({ html: compMain.html, $: comp$, headers: compMain.headers || {}, url: comp.url, resources: compMain.resources || {}, loadTime: compMain.loadTime || 0, webVitals: compMain.webVitals || {} });

        let myRule = null;
        if (myCrawl.status === 'fulfilled' && myCrawl.value) {
          const myMain = myCrawl.value.mainPage;
          const my$ = myMain.$;
          myRule = runRuleEngine({ html: myMain.html, $: my$, headers: myMain.headers || {}, url: myUrl, resources: myMain.resources || {}, loadTime: myMain.loadTime || 0, webVitals: myMain.webVitals || {} });
        }

        const insights = [];
        if (myRule) {
          for (const [k, cv] of Object.entries(compRule.scores)) {
            const mv = myRule.scores[k] || 0;
            const diff = cv - mv;
            if (diff >= 15) insights.push({ type: 'competitor_ahead', section: k, diff, msg: `رقیب در ${k} با ${diff} امتیاز جلوتر است` });
            if (diff <= -15) insights.push({ type: 'you_ahead', section: k, diff: Math.abs(diff), msg: `شما در ${k} با ${Math.abs(diff)} امتیاز جلوتر هستید` });
          }
        }

        const result = { competitor: { url: comp.url, scores: compRule.scores, finalScore: compRule.finalScore, stack: compRule.meta }, myScores: myRule?.scores || null, myScore: myRule?.finalScore || null, insights, generatedAt: new Date().toISOString() };
        Competitors.update(competitorId, { lastScore: compRule.finalScore, lastChecked: new Date().toISOString(), history: [{ date: new Date().toISOString(), score: compRule.finalScore }, ...(comp.history || [])].slice(0, 30) });
        Cache.set(`comp:${comp.url}`, result, 43200000);
        return res.status(200).json(result);
      } catch(e) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'delete') {
      const { competitorId } = req.body;
      Competitors.delete(competitorId);
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
