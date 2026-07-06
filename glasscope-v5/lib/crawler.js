// ══ Multi-Stage Adaptive Crawler v2 ══════════════════════════════
// Stage 1: Fast HTTP (axios) — fastest, lowest resource
// Stage 2: Smart Render (Playwright) — for JS-heavy / SPA
// Stage 3: Deep Adaptive (Playwright + wait strategies) — anti-bot / lazy load
// Automatic failover between stages with reason tracking

import axios from 'axios';
import * as cheerio from 'cheerio';

const FAILURE_REASONS = { TIMEOUT:'timeout', BLOCKED:'blocked', EMPTY:'empty', RENDER_FAIL:'render_fail', MEMORY:'memory', INVALID_DOM:'invalid_dom' };

// ── Stage 1: Fast HTTP ────────────────────────────────────────────
async function stage1(url) {
  const variants = [url];
  if (!url.includes('www.')) variants.push(url.replace(/^https?:\/\//, m => m + 'www.'));

  const strategies = [
    { timeout:12000, maxRedirects:10, validateStatus:s=>s<500,
      headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'fa,en;q=0.9','Accept-Encoding':'gzip,deflate,br','Cache-Control':'no-cache'} },
    { timeout:15000, maxRedirects:5, validateStatus:()=>true,
      headers:{'User-Agent':'Googlebot/2.1 (+http://www.google.com/bot.html)','Accept':'text/html'} },
    { timeout:20000, maxRedirects:0, validateStatus:()=>true,
      headers:{'User-Agent':'Mozilla/5.0 (compatible; Bingbot/2.0)','Accept':'text/html'} },
  ];

  let lastErr = null;
  for (const tryUrl of variants) {
    for (const cfg of strategies) {
      try {
        const res = await axios.get(tryUrl, cfg);
        const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        if (!html || html.length < 500) { lastErr = { reason: FAILURE_REASONS.EMPTY, msg: 'پاسخ خیلی کوتاه بود' }; continue; }
        // Detect bot challenge pages
        if (/cloudflare|just a moment|checking your browser|ddos-guard|enable javascript/i.test(html.slice(0,2000))) {
          lastErr = { reason: FAILURE_REASONS.BLOCKED, msg: 'Bot challenge شناسایی شد' }; continue;
        }
        return { html, headers: res.headers, url: tryUrl, stage: 1, status: res.status };
      } catch(e) {
        const reason = e.code === 'ECONNABORTED' ? FAILURE_REASONS.TIMEOUT : FAILURE_REASONS.BLOCKED;
        lastErr = { reason, msg: e.message, code: e.code, httpStatus: e.response?.status };
      }
    }
  }
  return { error: lastErr || { reason: FAILURE_REASONS.BLOCKED, msg: 'همه استراتژی‌های HTTP شکست خوردند' } };
}

// ── Stage 2: Smart Render (Playwright) ───────────────────────────
async function stage2(url) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled'] });
    try {
      const ctx = await browser.newContext({
        userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        viewport:{width:1440,height:900},
        locale:'fa-IR',
        extraHTTPHeaders:{'Accept-Language':'fa,en;q=0.9'},
      });
      const page = await ctx.newPage();
      // Hide automation signals
      await page.addInitScript(() => { Object.defineProperty(navigator,'webdriver',{get:()=>undefined}); });

      const requests = [];
      const resHeaders = {};
      page.on('request', r => requests.push({ url:r.url(), type:r.resourceType() }));
      page.on('response', async r => { if (r.url()===url || r.url()===url+'/') { try { Object.assign(resHeaders, r.headers()); } catch {} } });

      const t0 = Date.now();
      await page.goto(url, { waitUntil:'networkidle', timeout:30000 });
      // Wait for main content
      await page.waitForTimeout(1500);
      const loadTime = Date.now() - t0;

      const screenshot = await page.screenshot({ type:'jpeg', quality:72, fullPage:false });

      const webVitals = await page.evaluate(() => new Promise(res => {
        const v = { fcp:null, lcp:null, cls:0, ttfb:null };
        try {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) v.ttfb = Math.round(nav.responseStart - nav.requestStart);
          performance.getEntriesByType('paint').forEach(p => { if (p.name==='first-contentful-paint') v.fcp = Math.round(p.startTime); });
          const obs = new PerformanceObserver(list => { list.getEntries().forEach(e => { if (e.entryType==='largest-contentful-paint') v.lcp=Math.round(e.startTime); if (e.entryType==='layout-shift'&&!e.hadRecentInput) v.cls+=e.value; }); });
          obs.observe({ entryTypes:['largest-contentful-paint','layout-shift'] });
          setTimeout(() => res({ ...v, cls: v.cls ? +v.cls.toFixed(3) : 0 }), 1200);
        } catch { res(v); }
      }));

      const html = await page.content();
      await browser.close();

      if (!html || html.length < 500) return { error: { reason:FAILURE_REASONS.EMPTY, msg:'Playwright رندر کرد ولی محتوا خالی بود' } };

      return {
        html, headers: resHeaders, url, stage: 2,
        screenshot: screenshot.toString('base64'),
        loadTime, webVitals,
        resources: {
          js: requests.filter(r=>r.type==='script').length,
          css: requests.filter(r=>r.type==='stylesheet').length,
          images: requests.filter(r=>r.type==='image').length,
          fonts: requests.filter(r=>r.type==='font').length,
          total: requests.length,
        },
        networkRequests: requests.map(r=>r.url),
      };
    } catch(e) { await browser.close().catch(()=>{}); throw e; }
  } catch(e) {
    if (e.message?.includes('Cannot find module')) return { error: { reason:FAILURE_REASONS.RENDER_FAIL, msg:'Playwright نصب نیست — برای نصب: npm install playwright && npx playwright install chromium' } };
    return { error: { reason:FAILURE_REASONS.RENDER_FAIL, msg: e.message } };
  }
}

// ── Stage 3: Deep Adaptive ────────────────────────────────────────
async function stage3(url) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled'] });
    try {
      const ctx = await browser.newContext({
        userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        viewport:{width:1280,height:800},
      });
      const page = await ctx.newPage();
      await page.addInitScript(() => { Object.defineProperty(navigator,'webdriver',{get:()=>undefined}); window.chrome={runtime:{}}; });

      // Try with more lenient waitUntil
      try {
        await page.goto(url, { waitUntil:'domcontentloaded', timeout:25000 });
      } catch {
        await page.goto(url, { waitUntil:'load', timeout:20000 }).catch(()=>{});
      }

      // Progressive wait for content
      await page.waitForTimeout(3000);

      // Try scrolling to trigger lazy load
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(()=>{});
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0)).catch(()=>{});

      const html = await page.content();
      const screenshot = await page.screenshot({ type:'jpeg', quality:65, fullPage:false }).catch(()=>null);
      await browser.close();

      if (!html || html.length < 300) return { error: { reason:FAILURE_REASONS.EMPTY, msg:'حتی Stage 3 هم محتوای کافی نیافت' } };

      return { html, headers:{}, url, stage:3, screenshot: screenshot?.toString('base64') || null, webVitals:null, loadTime:null, resources:null, networkRequests:[] };
    } catch(e) { await browser.close().catch(()=>{}); throw e; }
  } catch(e) {
    return { error: { reason:FAILURE_REASONS.RENDER_FAIL, msg:e.message } };
  }
}

// ── Main Crawl Function ───────────────────────────────────────────
export async function crawlPage(url, options = {}) {
  const { skipPlaywright = false } = options;
  const log = [];

  // Stage 1
  log.push('Stage 1: HTTP fetch...');
  const s1 = await stage1(url);
  if (!s1.error) { log.push('✅ Stage 1 موفق'); return { ...s1, log }; }
  log.push(`⚠ Stage 1 شکست: ${s1.error.reason} — ${s1.error.msg}`);

  if (skipPlaywright) {
    throw new Error(`اتصال به سایت ناموفق: ${s1.error.msg}`);
  }

  // Stage 2
  log.push('Stage 2: Playwright render...');
  const s2 = await stage2(url);
  if (!s2.error) { log.push('✅ Stage 2 موفق'); return { ...s2, log }; }
  log.push(`⚠ Stage 2 شکست: ${s2.error.reason} — ${s2.error.msg}`);

  // Stage 3
  log.push('Stage 3: Deep adaptive crawl...');
  const s3 = await stage3(url);
  if (!s3.error) { log.push('✅ Stage 3 موفق'); return { ...s3, log }; }
  log.push(`❌ Stage 3 هم شکست: ${s3.error.msg}`);

  throw new Error(`هیچکدام از ۳ مرحله crawl موفق نشد.\nآخرین خطا: ${s3.error.msg}\n\nاحتمال: سایت bot-protected است یا در دسترس نیست.`);
}

// ── Multi-Page Crawl ──────────────────────────────────────────────
export async function crawlMultiPage(baseUrl, maxPages = 4) {
  const pages = [];
  const visited = new Set();

  async function visitPage(url, depth = 0) {
    if (depth > 1 || visited.size >= maxPages || visited.has(url)) return;
    visited.add(url);

    try {
      const result = await crawlPage(url, { skipPlaywright: depth > 0 }); // only use Playwright for main page
      const $ = cheerio.load(result.html);
      const title = $('title').text().trim();
      const type = detectType(url, result.html, $);
      pages.push({ ...result, $, title, type, depth });

      if (depth === 0) {
        const base = new URL(url);
        const links = [];
        $('a[href]').each((_, el) => {
          try {
            const href = $(el).attr('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            const full = href.startsWith('http') ? href : new URL(href, url).href;
            const u = new URL(full);
            if (u.hostname === base.hostname && !visited.has(full) && !full.match(/\.(pdf|jpg|png|gif|zip|css|js|xml|json)$/i)) {
              links.push(full);
            }
          } catch {}
        });
        const important = links.filter(l => /pricing|about|features|product|service|contact|blog|team/i.test(l));
        const toVisit = [...new Set([...important, ...links])].slice(0, maxPages - 1);
        for (const link of toVisit) {
          if (visited.size >= maxPages) break;
          await visitPage(link, 1);
        }
      }
    } catch(e) {
      if (depth === 0) throw e; // surface main page failures
      // sub-page failures are silently skipped
    }
  }

  await visitPage(baseUrl, 0);

  return {
    pages,
    pageCount: pages.length,
    pageTypes: pages.map(p => p.type),
    hasPricingPage: pages.some(p => p.type === 'pricing'),
    hasAboutPage: pages.some(p => p.type === 'about'),
    hasContactPage: pages.some(p => p.type === 'contact'),
    hasBlog: pages.some(p => p.type === 'blog'),
    mainPage: pages[0],
  };
}

function detectType(url, html, $) {
  const u = url.toLowerCase();
  const t = $('title').text().toLowerCase();
  if (/pricing|plan|قیمت/.test(u+t)) return 'pricing';
  if (/about|درباره/.test(u+t)) return 'about';
  if (/contact|تماس/.test(u+t)) return 'contact';
  if (/blog|news|article/.test(u+t)) return 'blog';
  if (/feature|product/.test(u+t)) return 'features';
  if (url.split('/').filter(Boolean).length <= 1) return 'homepage';
  return 'inner';
}
