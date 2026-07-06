import * as cheerio from 'cheerio';
import { validateURL } from '../../lib/ssrf.js';
import { Usage, Cache, Analytics, Reports, Benchmark } from '../../lib/store.js';
import { crawlMultiPage } from '../../lib/crawler.js';
import { runRuleEngine } from '../../lib/ruleEngine.js';
import { detectStack } from '../../lib/stackDetector.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';

  try { Usage.increment(`rl:${ip}`, 60000, 10); } catch(e) { return res.status(e.status||429).json({ error: e.message }); }

  let { url, forceRefresh, industry = 'saas' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL وارد نشده' });

  try {
    url = await validateURL(url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim());
    url = url.replace(/\/$/, '');
  } catch(e) { return res.status(400).json({ error: e.message }); }

  // Cache check
  if (!forceRefresh) {
    const cached = Cache.get(`report:${url}`);
    if (cached) {
      Analytics.track('analyze_complete', { url, fromCache: true, ip });
      return res.status(200).json({ ...cached, fromCache: true });
    }
  }

  Analytics.track('analyze_start', { url, ip, ua });

  try {
    // Multi-page crawl with 3-stage fallback
    const crawl = await crawlMultiPage(url, 4);
    const main = crawl.mainPage;
    const $ = main.$;

    // Stack detection
    const scripts = $('script[src]').map((_,el) => $(el).attr('src') || '').get();
    const styles = $('link[rel="stylesheet"]').map((_,el) => $(el).attr('href') || '').get();
    const stack = detectStack(main.html, scripts, styles, main.headers || {}, main.networkRequests || []);

    // Rule engine
    const rule = runRuleEngine({
      html: main.html, $,
      headers: main.headers || {},
      url,
      resources: main.resources || {},
      loadTime: main.loadTime || 0,
      webVitals: main.webVitals || {},
      networkRequests: main.networkRequests || [],
    });

    // Per-page scores
    const pageReports = crawl.pages.map(p => {
      const p$ = p.$;
      const pr = runRuleEngine({ html: p.html, $: p$, headers: p.headers || {}, url: p.url, resources:{}, loadTime:0, webVitals:{} });
      return { url: p.url, title: p.title, type: p.type, score: pr.finalScore, scores: pr.scores, issueCount: pr.allEvidence.filter(e=>e.severity==='critical'||e.severity==='high').length, stage: p.stage };
    });

    // Benchmarks
    const { fcp, lcp, ttfb } = rule.meta;
    const benchmarks = {
      fcp: fcp ? { value:fcp, percentile: Benchmark.getPercentile(fcp,'fcp',industry), ...Benchmark.getLabel(Benchmark.getPercentile(fcp,'fcp',industry)), industry: 1800 } : null,
      lcp: lcp ? { value:lcp, percentile: Benchmark.getPercentile(lcp,'lcp',industry), ...Benchmark.getLabel(Benchmark.getPercentile(lcp,'lcp',industry)), industry: 2500 } : null,
      ttfb: ttfb ? { value:ttfb, percentile: Benchmark.getPercentile(ttfb,'ttfb',industry), ...Benchmark.getLabel(Benchmark.getPercentile(ttfb,'ttfb',industry)), industry: 800 } : null,
    };

    // Element issues for heatmap overlay
    const elementIssues = [];
    $('img:not([alt])').each((i,el) => { if(i<12) elementIssues.push({ type:'img-no-alt', msg:`img#${i+1} — بدون alt text`, x: 10+Math.random()*80, y: 10+Math.random()*80 }); });

    const reportId = uuidv4();
    const report = {
      id: reportId,
      url,
      finalScore: rule.finalScore,
      scores: rule.scores,
      instantVerdict: rule.instantVerdict,
      strongest: rule.strongest,
      weakest: rule.weakest,
      allEvidence: rule.allEvidence,
      perfBreakdown: rule.perfBreakdown,
      seoEvidence: rule.seoEvidence,
      perfEvidence: rule.perfEvidence,
      uxEvidence: rule.uxEvidence,
      a11yEvidence: rule.a11yEvidence,
      mobileEvidence: rule.mobileEvidence,
      techEvidence: rule.techEvidence,
      secEvidence: rule.secEvidence,
      convEvidence: rule.convEvidence,
      trustEvidence: rule.trustEvidence,
      stack,
      meta: rule.meta,
      benchmarks,
      elementIssues,
      screenshot: main.screenshot ? `data:image/jpeg;base64,${main.screenshot}` : null,
      webVitals: main.webVitals || null,
      resources: main.resources || null,
      loadTime: main.loadTime || null,
      crawlStage: main.stage,
      crawlLog: main.log || [],
      usedPlaywright: main.stage === 2 || main.stage === 3,
      pages: pageReports,
      crawlInfo: { pageCount: crawl.pageCount, pageTypes: crawl.pageTypes, hasPricingPage: crawl.hasPricingPage, hasAboutPage: crawl.hasAboutPage, hasContactPage: crawl.hasContactPage, hasBlog: crawl.hasBlog },
      industry,
      generatedAt: new Date().toISOString(),
    };

    Cache.set(`report:${url}`, report, 86400000);
    Reports.save(reportId, report);
    Analytics.track('analyze_complete', { url, score: rule.finalScore, ip, stage: main.stage });

    return res.status(200).json(report);
  } catch(e) {
    console.error('❌ analyze error:', e.message);
    Analytics.track('analyze_error', { url, error: e.message, ip });
    return res.status(500).json({ error: e.message });
  }
}
