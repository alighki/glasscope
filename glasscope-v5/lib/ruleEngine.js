// ══ GLASSCOPE RULE ENGINE v4 — Evidence-Based Scoring ════════════
import { getPercentile, getBenchmarkLabel, getIndustryAvg } from './benchmark.js';

export function runRuleEngine(data) {
  const { html, headers={}, url='', resources={}, loadTime=0, webVitals={}, networkRequests=[], scriptSizes=[] } = data;
  const $ = data.$;

  // ── 1. SEO — Numerical Evidence ──────────────────────────
  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const imgCount = $('img').length;
  const imgAlt = $('img[alt]').length;
  const imgNoAlt = imgCount - imgAlt;
  const altRatio = imgCount > 0 ? imgAlt/imgCount : 1;
  const hasCanon = $('link[rel="canonical"]').length > 0;
  const canonUrl = $('link[rel="canonical"]').attr('href') || '';
  const hasOG = $('meta[property="og:title"]').length > 0;
  const hasTW = $('meta[name="twitter:card"]').length > 0;
  const hasSchema = html.includes('application/ld+json');
  const hasSitemap = html.includes('sitemap');
  const metaRobots = $('meta[name="robots"]').attr('content') || '';
  const isIndexable = !metaRobots.includes('noindex');

  let seo = 0;
  if (title) seo += 12; if (title.length>=30&&title.length<=60) seo += 8;
  if (metaDesc) seo += 12; if (metaDesc.length>=100&&metaDesc.length<=160) seo += 6;
  if (h1Count===1) seo += 14; else if (h1Count>1) seo += 4;
  if (h2Count>=2) seo += 8; if (h3Count>=2) seo += 4;
  if (altRatio>=0.9) seo += 10; else if (altRatio>=0.6) seo += 5;
  if (hasCanon) seo += 6; if (hasOG) seo += 6; if (hasTW) seo += 4;
  if (hasSchema) seo += 6; if (hasSitemap) seo += 4;
  seo = Math.min(100, seo);

  // SEO Evidence (specific numbers)
  const seoEvidence = [];
  if (!title) seoEvidence.push({ severity:'critical', msg:'عنوان صفحه وجود ندارد', fix:'تگ <title> اضافه کن' });
  else if (title.length<30) seoEvidence.push({ severity:'high', msg:`عنوان فقط ${title.length} کاراکتر (کمتر از ۳۰)`, fix:'عنوان را به ۳۰-۶۰ کاراکتر افزایش بده' });
  else if (title.length>60) seoEvidence.push({ severity:'medium', msg:`عنوان ${title.length} کاراکتر (بیشتر از ۶۰)`, fix:`${title.length-60} کاراکتر کوتاه کن` });
  if (!metaDesc) seoEvidence.push({ severity:'critical', msg:'متا دسکریپشن ندارد — CTR گوگل آسیب می‌بیند', fix:'متا دسکریپشن ۱۲۰-۱۶۰ کاراکتری بنویس' });
  if (h1Count===0) seoEvidence.push({ severity:'critical', msg:'صفحه H1 ندارد — ranking اصلی از دست می‌رود', fix:'یک H1 با کلمه کلیدی اصلی اضافه کن' });
  if (h1Count>1) seoEvidence.push({ severity:'high', msg:`${h1Count} H1 در صفحه — باید فقط یکی باشد`, fix:`${h1Count-1} H1 را به H2 تبدیل کن` });
  if (imgNoAlt>0) seoEvidence.push({ severity:'high', msg:`${imgNoAlt} از ${imgCount} تصویر (${Math.round((1-altRatio)*100)}٪) alt text ندارند`, fix:`به ${imgNoAlt} تصویر alt text اضافه کن` });
  if (!hasCanon) seoEvidence.push({ severity:'medium', msg:'Canonical URL تنظیم نشده — خطر duplicate content', fix:'link[rel="canonical"] به head اضافه کن' });
  if (!hasOG) seoEvidence.push({ severity:'medium', msg:'OpenGraph tags ندارد — اشتراک سوشال ضعیف است', fix:'og:title, og:description, og:image اضافه کن' });
  if (!hasSchema) seoEvidence.push({ severity:'medium', msg:'Schema.org markup ندارد — نتایج غنی گوگل از دست می‌رود', fix:'JSON-LD structured data اضافه کن' });
  if (!isIndexable) seoEvidence.push({ severity:'critical', msg:'robots meta tag صفحه را noindex کرده!', fix:'محتوای meta robots را بررسی کن' });

  // ── 2. Performance — Root Cause Analysis ─────────────────
  const jsFiles = resources.js ?? $('script[src]').length;
  const cssFiles = resources.css ?? $('link[rel="stylesheet"]').length;
  const imgFiles = resources.images ?? imgCount;
  const fontFiles = resources.fonts ?? 0;
  const totalReqs = resources.total ?? (jsFiles+cssFiles+imgFiles+fontFiles+5);
  const htmlKB = Math.round(html.length/1024);
  const hasLazy = html.includes('loading="lazy"')||html.includes("loading='lazy'");
  const hasGzip = !!headers['content-encoding']?.includes('gzip');
  const hasBrotli = !!headers['content-encoding']?.includes('br');
  const hasPreload = html.includes('rel="preload"');
  const hasWebp = html.includes('.webp')||html.includes('image/webp');
  const hasAvif = html.includes('.avif');
  const hasServiceWorker = html.includes('serviceWorker');
  const fcp = webVitals?.fcp;
  const lcp = webVitals?.lcp;
  const cls = webVitals?.cls;
  const ttfb = webVitals?.ttfb;
  const tbt = webVitals?.tbt;
  const inpScore = webVitals?.inp;

  let perf = 40;
  if (jsFiles<=5) perf+=14; else if (jsFiles<=10) perf+=7; else if (jsFiles>20) perf-=12;
  if (cssFiles<=3) perf+=10; else if (cssFiles>8) perf-=6;
  if (htmlKB<80) perf+=8; else if (htmlKB>400) perf-=8;
  if (hasLazy) perf+=8; if (hasGzip||hasBrotli) perf+=7;
  if (hasPreload) perf+=5; if (hasWebp) perf+=4; if (hasAvif) perf+=3;
  if (fcp) { if(fcp<1800) perf+=10; else if(fcp<3000) perf+=4; else perf-=10; }
  if (lcp) { if(lcp<2500) perf+=10; else if(lcp<4000) perf+=4; else perf-=10; }
  if (cls!=null) { if(cls<0.1) perf+=6; else if(cls>0.25) perf-=8; }
  if (ttfb) { if(ttfb<800) perf+=5; else if(ttfb>1800) perf-=6; }
  if (loadTime>0) { if(loadTime<2000) perf+=5; else if(loadTime>6000) perf-=10; }
  perf = Math.max(0, Math.min(100, perf));

  // Performance Root Cause Breakdown
  const perfBreakdown = [];
  const fcpP = getPercentile(fcp,'fcp'); const lcpP = getPercentile(lcp,'lcp');
  const ttfbP = getPercentile(ttfb,'ttfb'); const jsP = getPercentile(jsFiles*100,'jsSize');

  if (jsFiles>0) {
    const jsWeight = jsFiles>15?'سنگین':jsFiles>8?'متوسط':'سبک';
    const jsImpact = jsFiles>15?38:jsFiles>8?20:8;
    perfBreakdown.push({ factor:'JS Bundle', impact:jsImpact, detail:`${jsFiles} فایل JS`, evidence:`بار JS ≈ ${jsImpact}٪ کندی اولیه`, fix:jsFiles>15?'Code splitting اعمال کن، vendor chunk جدا کن':jsFiles>8?'bundle-analyzer استفاده کن':'✓ خوب' });
  }
  if (imgFiles>0) {
    const imgImpact = (!hasLazy&&imgFiles>5)?24:(!hasWebp&&imgFiles>3)?14:5;
    perfBreakdown.push({ factor:'تصاویر', impact:imgImpact, detail:`${imgFiles} تصویر، lazy:${hasLazy?'✓':'✗'}, WebP:${hasWebp?'✓':'✗'}`, evidence:`تصاویر ≈ ${imgImpact}٪ بار صفحه`, fix:!hasLazy?'loading="lazy" به تصاویر اضافه کن':!hasWebp?'فرمت WebP/AVIF استفاده کن':'✓ خوب' });
  }
  if (cssFiles>0) {
    const cssImpact = cssFiles>6?17:cssFiles>3?10:4;
    perfBreakdown.push({ factor:'CSS', impact:cssImpact, detail:`${cssFiles} فایل CSS${!hasGzip?' بدون فشرده‌سازی':''}`, evidence:`CSS ≈ ${cssImpact}٪ render blocking`, fix:cssFiles>6?'CSS را merge و minify کن':!hasGzip?'Gzip/Brotli فعال کن':'✓ خوب' });
  }
  if (ttfb&&ttfb>800) perfBreakdown.push({ factor:'سرور (TTFB)', impact:12, detail:`TTFB: ${ttfb}ms ${getBenchmarkLabel(ttfbP)?.label||''}`, evidence:'زمان پاسخ سرور زیاد است', fix:'CDN استفاده کن، caching فعال کن، سرور را upgrade کن' });
  if (fontFiles>2) perfBreakdown.push({ factor:'فونت‌ها', impact:9, detail:`${fontFiles} فایل فونت`, evidence:'فونت‌های زیاد render را block می‌کنند', fix:'font-display:swap استفاده کن، تعداد فونت را کاهش بده' });

  // Performance evidence
  const perfEvidence = [];
  if (fcp&&fcp>1800) perfEvidence.push({ severity:fcp>3000?'critical':'high', msg:`FCP: ${fcp}ms — ${getBenchmarkLabel(fcpP)?.label||''}`, detail:`میانگین صنعت: ${getIndustryAvg('fcp')}ms`, fix:'تصاویر hero را preload کن، CSS critical را inline کن' });
  if (lcp&&lcp>2500) perfEvidence.push({ severity:lcp>4000?'critical':'high', msg:`LCP: ${lcp}ms — ${getBenchmarkLabel(lcpP)?.label||''}`, detail:`میانگین صنعت: ${getIndustryAvg('lcp')}ms`, fix:'بزرگترین المان را preload کن' });
  if (cls&&cls>0.1) perfEvidence.push({ severity:cls>0.25?'critical':'high', msg:`CLS: ${cls.toFixed(3)} — Layout shift زیاد`, detail:'المان‌ها هنگام لود جابجا می‌شوند', fix:'ابعاد تصاویر و ads را از قبل مشخص کن' });
  if (ttfb&&ttfb>800) perfEvidence.push({ severity:ttfb>1800?'critical':'high', msg:`TTFB: ${ttfb}ms — سرور کُند است`, detail:`${getBenchmarkLabel(ttfbP)?.label||''}`, fix:'CDN اضافه کن، server-side caching فعال کن' });
  if (jsFiles>15) perfEvidence.push({ severity:'high', msg:`${jsFiles} فایل JS — بیش از حد معمول`, detail:`میانگین SaaS: ۸-۱۲ فایل`, fix:'Code splitting و lazy imports اضافه کن' });
  if (!hasLazy&&imgFiles>3) perfEvidence.push({ severity:'high', msg:`${imgFiles} تصویر بدون lazy loading`, detail:'همه تصاویر از اول لود می‌شوند', fix:'loading="lazy" به img tags اضافه کن' });
  if (!hasGzip&&!hasBrotli) perfEvidence.push({ severity:'high', msg:'فشرده‌سازی غیرفعال است', detail:'حجم انتقالی بیش از حد است', fix:'Gzip یا Brotli روی سرور فعال کن' });

  // ── 3. UX ────────────────────────────────────────────────
  const ctaTexts = $('button,[class*="btn"],[class*="cta"],a[class*="btn"]').map((_,el)=>$(el).text().trim().toLowerCase()).get();
  const strongCTAs = ctaTexts.filter(t=>/get|start|try|sign|buy|join|free|demo|now|begin|download|register/.test(t)).length;
  const weakCTAs = ctaTexts.filter(t=>/click here|more|learn|read|see/.test(t)).length;
  const navCount = $('nav').length;
  const hasHero = $('[class*="hero"],section:first-of-type,[class*="banner"]').length>0;
  const hasFooter = $('footer').length>0;
  const sectionCount = $('section').length;
  const ctaCount = $('button,[class*="btn"],[class*="cta"]').length;
  const hasSearch = $('input[type="search"],[class*="search-input"]').length>0;
  const hasNewsletter = html.toLowerCase().includes('newsletter')||html.toLowerCase().includes('subscribe');
  const hasChat = html.includes('intercom')||html.includes('crisp')||html.includes('zendesk')||html.includes('tawk');
  const hasStickyNav = html.includes('position:fixed')||html.includes('sticky')||html.includes('fixed-top');

  let ux = 25;
  if (strongCTAs>=1) ux+=18; if (strongCTAs>=2) ux+=8;
  if (navCount>=1) ux+=14; if (hasHero) ux+=10; if (hasFooter) ux+=8;
  if (sectionCount>=3) ux+=7; if (sectionCount>=5) ux+=5;
  if (ctaCount>=2&&ctaCount<=10) ux+=5; else if (ctaCount>15) ux-=5;
  if (hasSearch) ux+=5; if (hasNewsletter) ux+=4; if (hasStickyNav) ux+=3;
  if (weakCTAs>strongCTAs) ux-=5;
  ux = Math.min(100, ux);

  const uxEvidence = [];
  if (strongCTAs===0) uxEvidence.push({ severity:'critical', msg:'هیچ CTA قوی یافت نشد', detail:`${ctaCount} دکمه وجود دارد ولی هیچکدام action-oriented نیست`, fix:'متن دکمه‌ها را به "شروع رایگان"، "امتحان کن" تغییر بده' });
  if (weakCTAs>3) uxEvidence.push({ severity:'medium', msg:`${weakCTAs} CTA ضعیف ("اینجا کلیک کن"، "بیشتر")`, detail:'کلمات generic کاربر را به عمل وادار نمی‌کنند', fix:'CTAها را action-specific کن' });
  if (ctaCount>15) uxEvidence.push({ severity:'medium', msg:`${ctaCount} CTA — بیش از حد و confusing`, detail:'Paradox of choice کاربر را سردرگم می‌کند', fix:'به ۳-۵ CTA اصلی محدود کن' });
  if (!hasHero) uxEvidence.push({ severity:'high', msg:'بخش Hero یافت نشد', detail:'کاربر در ۳ ثانیه اول نمی‌فهمد سایت چیست', fix:'Hero section با value proposition واضح اضافه کن' });
  if (!hasStickyNav) uxEvidence.push({ severity:'low', msg:'Navigation ثابت (sticky) نیست', detail:'کاربر باید بالا scroll کند', fix:'nav را position:sticky کن' });

  // ── 4. Accessibility — WCAG Evidence ─────────────────────
  const ariaLabels = $('[aria-label]').length;
  const ariaRoles = $('[role]').length;
  const hasMain = $('main').length>0;
  const hasLang = html.match(/lang=["'][a-z]{2}/i);
  const hasSkip = html.includes('skip-link')||(html.includes('skip')&&html.includes('navigation'));
  const inputCount = $('input:not([type="hidden"])').length;
  const labelCount = $('label').length;
  const labelRatio = inputCount>0?labelCount/inputCount:1;
  const hasFocusStyle = html.includes(':focus')||html.includes('focus-visible')||html.includes('outline');
  const contrastWarnings = [];
  // Simple contrast heuristic (real would need computed styles)
  if (html.includes('color:#fff')&&html.includes('background:#fff')) contrastWarnings.push('متن سفید روی پس‌زمینه سفید');
  if (html.includes('color:#000')&&html.includes('background:#000')) contrastWarnings.push('متن مشکی روی پس‌زمینه مشکی');

  let a11y = 15;
  if (altRatio>=0.9) a11y+=20; else if (altRatio>=0.6) a11y+=10; else if (altRatio>=0.3) a11y+=4;
  if (ariaLabels>=5) a11y+=15; else if (ariaLabels>=2) a11y+=8;
  if (ariaRoles>=4) a11y+=10; else if (ariaRoles>=2) a11y+=5;
  if (hasMain) a11y+=10; if (hasLang) a11y+=8; if (hasSkip) a11y+=8;
  if (labelRatio>=0.9) a11y+=7; if (hasFocusStyle) a11y+=7;
  a11y = Math.min(100, a11y);

  const a11yEvidence = [];
  if (imgNoAlt>0) a11yEvidence.push({ severity:'critical', msg:`${imgNoAlt} تصویر (${Math.round((1-altRatio)*100)}٪) بدون alt text`, wcag:'WCAG 2.1 — 1.1.1 Non-text Content', fix:`به ${imgNoAlt} img tag، alt="" یا alt="توضیح" اضافه کن` });
  if (!hasMain) a11yEvidence.push({ severity:'high', msg:'تگ <main> وجود ندارد', wcag:'WCAG 2.4.1 — Bypass Blocks', fix:'محتوای اصلی را در <main> قرار بده' });
  if (!hasLang) a11yEvidence.push({ severity:'high', msg:'lang attribute در <html> ندارد', wcag:'WCAG 3.1.1 — Language of Page', fix:'lang="fa" یا lang="en" به <html> اضافه کن' });
  if (ariaLabels<3) a11yEvidence.push({ severity:'medium', msg:`فقط ${ariaLabels} aria-label در صفحه`, wcag:'WCAG 2.4.6 — Headings and Labels', fix:'به دکمه‌ها و interactive elements، aria-label اضافه کن' });
  if (labelRatio<0.8&&inputCount>0) a11yEvidence.push({ severity:'high', msg:`${Math.round((1-labelRatio)*100)}٪ input ها label ندارند`, wcag:'WCAG 1.3.1 — Info and Relationships', fix:'برای هر input یک label یا aria-label اضافه کن' });
  if (!hasSkip) a11yEvidence.push({ severity:'medium', msg:'Skip navigation link ندارد', wcag:'WCAG 2.4.1', fix:'"Skip to main content" link ابتدای صفحه اضافه کن' });

  // ── 5. Mobile ────────────────────────────────────────────
  const vpContent = $('meta[name="viewport"]').attr('content')||'';
  const hasVP = vpContent.length>0;
  const hasDeviceWidth = vpContent.includes('width=device-width');
  const hasMQ = html.includes('@media');
  const hasFlexGrid = html.includes('display:flex')||html.includes('display: flex')||html.includes('display:grid')||html.includes('display: grid');
  const hasTouchEvents = html.includes('touchstart')||html.includes('touchend')||html.includes('ontap');
  const hasMobileMenu = html.includes('hamburger')||html.includes('mobile-menu')||html.includes('nav-toggle')||html.includes('menu-toggle');

  let mobile = 15;
  if (hasVP) mobile+=25; if (hasDeviceWidth) mobile+=15; if (hasMQ) mobile+=15;
  if (hasFlexGrid) mobile+=12; if (hasMobileMenu) mobile+=8; if (hasTouchEvents) mobile+=5; if (hasWebp) mobile+=5;
  mobile = Math.min(100, mobile);

  const mobileEvidence = [];
  if (!hasVP) mobileEvidence.push({ severity:'critical', msg:'Viewport meta tag وجود ندارد', detail:'سایت روی موبایل zoom شده نمایش داده می‌شود', fix:'<meta name="viewport" content="width=device-width, initial-scale=1"> اضافه کن' });
  if (!hasMQ) mobileEvidence.push({ severity:'high', msg:'هیچ Media Query یافت نشد', detail:'طراحی responsive ندارد', fix:'breakpointهای CSS برای موبایل اضافه کن' });
  if (!hasMobileMenu&&navCount>0) mobileEvidence.push({ severity:'medium', msg:'Mobile menu (hamburger) یافت نشد', detail:'Navigation روی موبایل احتمالاً شکسته است', fix:'Hamburger menu برای موبایل پیاده‌سازی کن' });

  // ── 6. Content Quality ───────────────────────────────────
  const bodyText = $('body').text().replace(/\s+/g,' ').trim();
  const wordCount = bodyText.split(' ').filter(Boolean).length;
  const paraCount = $('p').length;
  const hasBlog = html.includes('blog')||$('article').length>0;
  const hasVideo = $('video,iframe[src*="youtube"],iframe[src*="vimeo"]').length>0;
  const hasTestimonials = html.toLowerCase().includes('testimonial')||html.toLowerCase().includes('review');
  const hasFAQ = html.toLowerCase().includes('faq')||html.toLowerCase().includes('frequently asked');
  const hasDataStats = /\d+[k+%]/.test(html);

  let content = 15;
  if (wordCount>=300) content+=12; if (wordCount>=800) content+=10; if (wordCount>=1500) content+=8;
  if (paraCount>=5) content+=12; if (paraCount>=10) content+=8;
  if (hasBlog) content+=10; if (hasVideo) content+=8;
  if (hasTestimonials) content+=8; if (hasFAQ) content+=7; if (hasDataStats) content+=7; if (hasNewsletter) content+=5;
  content = Math.min(100, content);

  const contentEvidence = [];
  if (wordCount<300) contentEvidence.push({ severity:'high', msg:`فقط ~${wordCount} کلمه در صفحه`, detail:'محتوای کم = سئو ضعیف + اعتماد کم', fix:'حداقل ۵۰۰ کلمه محتوای با ارزش اضافه کن' });
  if (!hasTestimonials) contentEvidence.push({ severity:'medium', msg:'Social proof (نظر مشتریان) ندارد', detail:'Conversion rate بدون social proof پایین‌تر است', fix:'testimonial یا review اضافه کن' });
  if (!hasDataStats) contentEvidence.push({ severity:'low', msg:'آمار و اعداد (۱۰K users، ۹۸٪ رضایت) ندارد', detail:'اعداد اعتماد را افزایش می‌دهند', fix:'metrics واقعی به hero section اضافه کن' });

  // ── 7. Conversion ────────────────────────────────────────
  const hasPricing = html.toLowerCase().includes('pricing')||html.toLowerCase().includes('plan')||html.toLowerCase().includes('قیمت');
  const hasEmailCapture = $('input[type="email"]').length>0;
  const hasSocialProof = hasTestimonials||/\d+[k+,]?\s*(customer|user|client)/.test(html.toLowerCase());
  const hasUrgency = html.toLowerCase().includes('limited')||html.toLowerCase().includes('today only')||html.toLowerCase().includes('expires');
  const hasGuarantee = html.toLowerCase().includes('guarantee')||html.toLowerCase().includes('refund')||html.toLowerCase().includes('money back');
  const hasTrial = html.toLowerCase().includes('free trial')||html.toLowerCase().includes('14-day')||html.toLowerCase().includes('30-day');
  const hasTrustBadges = html.includes('ssl')||html.includes('secure')||html.includes('verified')||html.includes('certified');

  let conv = 15;
  if (strongCTAs>=1) conv+=18; if (strongCTAs>=3) conv+=8;
  if (hasPricing) conv+=14; if (hasEmailCapture) conv+=10;
  if (hasSocialProof) conv+=10; if (hasUrgency) conv+=6;
  if (hasGuarantee) conv+=8; if (hasTrial) conv+=6; if (hasTrustBadges) conv+=5;
  conv = Math.min(100, conv);

  const convEvidence = [];
  if (!hasPricing) convEvidence.push({ severity:'high', msg:'صفحه pricing/قیمت‌گذاری ندارد', detail:'کاربر نمی‌داند باید چقدر بپردازد', fix:'pricing واضح یا CTA به pricing اضافه کن' });
  if (!hasGuarantee) convEvidence.push({ severity:'medium', msg:'ضمانت یا refund policy ندارد', detail:'Risk reversal اعتماد را بالا می‌برد', fix:'"۳۰ روز ضمانت بازگشت پول" اضافه کن' });
  if (!hasTrial&&!hasEmailCapture) convEvidence.push({ severity:'high', msg:'نه free trial نه email capture', detail:'کاربر بدون تبدیل می‌رود', fix:'حداقل یکی از: trial رایگان یا email opt-in اضافه کن' });

  // ── 8. Technical ─────────────────────────────────────────
  const hasDoctype = html.toLowerCase().trim().startsWith('<!doctype');
  const semanticCount = $('header,main,footer,nav,section,article,aside').length;
  const inlineScripts = $('script:not([src])').length;
  const iframeCount = $('iframe').length;
  const hasConsoleLog = html.includes('console.log');
  const hasMixedContent = url.startsWith('https')&&html.includes('http://');
  const hasSourceMaps = html.includes('.map')||networkRequests.some(r=>r.endsWith('.map'));
  const hasDebugEndpoints = html.includes('/debug')||html.includes('/__debug')||html.includes('staging');
  const hasEnvVars = /NEXT_PUBLIC_[A-Z_]+=|REACT_APP_[A-Z_]+=/.test(html);
  const hasErrorBoundary = html.includes('ErrorBoundary');

  let tech = 25;
  if (hasDoctype) tech+=10;
  if (semanticCount>=5) tech+=18; else if (semanticCount>=3) tech+=10; else if (semanticCount>=1) tech+=5;
  if (inlineScripts<=2) tech+=10; else if (inlineScripts>10) tech-=10;
  if (!hasConsoleLog) tech+=6; if (!hasMixedContent) tech+=6;
  if (!hasSourceMaps) tech+=5; if (!hasDebugEndpoints) tech+=5;
  if (hasErrorBoundary) tech+=5; if (hasServiceWorker) tech+=10;
  if (hasEnvVars) tech-=15; // env leak!
  tech = Math.max(0, Math.min(100, tech));

  const techEvidence = [];
  if (hasEnvVars) techEvidence.push({ severity:'critical', msg:'⚠ متغیرهای محیطی در HTML قابل مشاهده است!', detail:'API key یا secret leak شده', fix:'فوری: env vars را از frontend bundle حذف کن' });
  if (hasConsoleLog) techEvidence.push({ severity:'medium', msg:'console.log در production وجود دارد', detail:'اطلاعات debug در مرورگر کاربر نمایش داده می‌شود', fix:'در build process، console.log را حذف کن' });
  if (hasMixedContent) techEvidence.push({ severity:'high', msg:'Mixed Content: HTTP resource در HTTPS سایت', detail:'Browser این content را block می‌کند', fix:'همه URLها را به HTTPS تغییر بده' });
  if (hasSourceMaps) techEvidence.push({ severity:'medium', msg:'Source map files در production', detail:'کد منبع قابل خواندن است', fix:'source maps را در production غیرفعال کن' });
  if (semanticCount<3) techEvidence.push({ severity:'medium', msg:`فقط ${semanticCount} تگ semantic HTML`, detail:'ساختار HTML non-semantic است', fix:'header, main, footer, nav, section, article استفاده کن' });
  if (inlineScripts>5) techEvidence.push({ severity:'medium', msg:`${inlineScripts} inline script`, detail:'خطر XSS و performance ضعیف', fix:'scripts را به فایل‌های جداگانه منتقل کن' });

  // ── 9. Security — Deep Headers ────────────────────────────
  const isHttps = url.startsWith('https');
  const csp = headers['content-security-policy'];
  const xFrame = headers['x-frame-options'];
  const xContent = headers['x-content-type-options'];
  const hsts = headers['strict-transport-security'];
  const xss = headers['x-xss-protection'];
  const refPolicy = headers['referrer-policy'];
  const permPolicy = headers['permissions-policy'];
  const setCookie = headers['set-cookie']||'';
  const hasSecureCookie = setCookie.includes('Secure');
  const hasHttpOnlyCookie = setCookie.includes('HttpOnly');
  const hasSameSite = setCookie.includes('SameSite');
  const hasFormValidation = html.includes('required')||html.includes('pattern=');
  const hasRecaptcha = html.includes('recaptcha')||html.includes('hcaptcha');
  const hasOpenRedirect = html.includes('window.location=')||html.includes('location.href=');

  let sec = 5;
  if (isHttps) sec+=25; if (csp) sec+=18; if (xFrame) sec+=10;
  if (xContent) sec+=8; if (hsts) sec+=8; if (xss) sec+=4;
  if (refPolicy) sec+=5; if (permPolicy) sec+=4;
  if (hasSecureCookie) sec+=4; if (hasHttpOnlyCookie) sec+=4; if (hasSameSite) sec+=4;
  if (hasFormValidation) sec+=3; if (hasRecaptcha) sec+=3;
  if (hasEnvVars) sec-=20;
  sec = Math.max(0, Math.min(100, sec));

  const secEvidence = [];
  if (!isHttps) secEvidence.push({ severity:'critical', msg:'سایت از HTTP استفاده می‌کند — اتصال رمزگذاری نشده', detail:'اطلاعات کاربر در خطر است', fix:'SSL certificate رایگان با Let\'s Encrypt نصب کن' });
  if (!csp) secEvidence.push({ severity:'critical', msg:'Content Security Policy (CSP) ندارد', detail:'آسیب‌پذیری XSS attack بالقوه', fix:'CSP header با policy مناسب تنظیم کن' });
  if (!xFrame) secEvidence.push({ severity:'high', msg:'X-Frame-Options ندارد — خطر Clickjacking', detail:'سایت می‌تواند در iframe دیگران لود شود', fix:'X-Frame-Options: DENY یا SAMEORIGIN اضافه کن' });
  if (!hsts) secEvidence.push({ severity:'high', msg:'HSTS غیرفعال است', detail:'HTTPS enforcement کامل نیست', fix:'Strict-Transport-Security header اضافه کن' });
  if (!xContent) secEvidence.push({ severity:'medium', msg:'X-Content-Type-Options ندارد', detail:'MIME sniffing attack ممکن است', fix:'X-Content-Type-Options: nosniff اضافه کن' });
  if (setCookie&&!hasSecureCookie) secEvidence.push({ severity:'high', msg:'Cookie بدون Secure flag', detail:'Cookie از طریق HTTP قابل سرقت است', fix:'Set-Cookie: ...;Secure;HttpOnly;SameSite=Strict' });
  if (hasEnvVars) secEvidence.push({ severity:'critical', msg:'🚨 API key/ENV var در HTML کشف شد!', detail:'امنیت کامل نقض شده', fix:'فوری همه keyها را rotate کن' });

  // ── 10. Trust ────────────────────────────────────────────
  const hasAbout = html.toLowerCase().includes('about');
  const hasContact = html.toLowerCase().includes('contact')||html.toLowerCase().includes('تماس');
  const hasPrivacy = html.toLowerCase().includes('privacy')||html.toLowerCase().includes('حریم');
  const hasSocial = html.includes('twitter')||html.includes('linkedin')||html.includes('instagram');
  const hasCopyright = html.includes('©')||html.toLowerCase().includes('copyright');
  const hasPhone = /\+?[\d\s\-()]{10,}/.test(html);
  const hasAddress = html.toLowerCase().includes('address')||$('address').length>0;
  const hasCookieConsent = (html.includes('cookie')&&(html.includes('consent')||html.includes('gdpr')));
  const trustScore = [hasAbout,hasContact,hasPrivacy,hasSocial,hasCopyright,hasTestimonials,hasPhone,hasAddress,hasCookieConsent].filter(Boolean).length;

  let trust = Math.round((trustScore/9)*100);
  trust = Math.min(95, trust); // never 100 — can't verify legitimacy from code alone

  const trustEvidence = [];
  if (!hasPrivacy) trustEvidence.push({ severity:'high', msg:'Privacy Policy ندارد — GDPR مشکل', detail:'در اروپا الزامی قانونی است', fix:'Privacy Policy صفحه اضافه کن' });
  if (!hasContact) trustEvidence.push({ severity:'medium', msg:'اطلاعات تماس یافت نشد', detail:'کاربر نمی‌تواند با شما ارتباط برقرار کند', fix:'email، phone یا contact form اضافه کن' });
  if (!hasCookieConsent) trustEvidence.push({ severity:'medium', msg:'Cookie consent banner ندارد', detail:'GDPR/CCPA compliance مشکل دارد', fix:'cookie consent solution اضافه کن' });

  // ── 11. Navigation ───────────────────────────────────────
  const menuItems = $('nav a,nav li').length;
  const hasBreadcrumb = html.includes('breadcrumb');
  const internalLinks = $('a[href^="/"],[href^="./"]').length;
  const hasDropdown = html.includes('dropdown')||html.includes('submenu');
  const externalLinks = $('a[href^="http"]').length;
  const hasNofollow = html.includes('rel="nofollow"')||html.includes("rel='nofollow'");

  let nav = 15;
  if (navCount>=1) nav+=22; if (menuItems>=3&&menuItems<=12) nav+=14; else if (menuItems>12) nav+=7;
  if (hasFooter) nav+=10; if (hasBreadcrumb) nav+=8; if (internalLinks>=5) nav+=10;
  if (hasDropdown) nav+=6; if (hasStickyNav) nav+=5;
  nav = Math.min(100, nav);

  // ── 12. Innovation ───────────────────────────────────────
  const hasDarkMode = html.includes('prefers-color-scheme')||html.includes('data-theme');
  const hasAnimation = html.includes('framer')||html.includes('gsap')||html.includes('@keyframes');
  const hasPWA = html.includes('manifest')||hasServiceWorker;
  const hasAnalytics = html.includes('gtag')||html.includes('analytics')||html.includes('hotjar');
  const hasWebGL = html.includes('webgl')||html.includes('three.js');
  const hasI18n = ($('html').attr('lang')||'').length>0&&html.includes('lang=');

  let innov = 10;
  if (hasDarkMode) innov+=15; if (hasAnimation) innov+=15; if (hasPWA) innov+=15;
  if (hasAnalytics) innov+=12; if (hasChat) innov+=10; if (hasWebGL) innov+=12; if (hasI18n) innov+=11;
  innov = Math.min(100, innov);

  // ── WEIGHTS & FINAL ──────────────────────────────────────
  const weights = { seo:0.18,performance:0.18,ux:0.12,accessibility:0.10,mobile:0.10,content:0.07,conversion:0.07,technical:0.07,security:0.05,trust:0.03,navigation:0.02,innovation:0.01 };
  const scores = { seo,performance:perf,ux,accessibility:a11y,mobile,content,conversion:conv,technical:tech,security:sec,trust,navigation:nav,innovation:innov };
  const finalScore = Math.round(Object.entries(weights).reduce((s,[k,w])=>s+scores[k]*w,0));

  // ── All Issues (sorted by priority) ──────────────────────
  const allEvidence = [
    ...seoEvidence.map(e=>({...e,section:'سئو'})),
    ...perfEvidence.map(e=>({...e,section:'عملکرد'})),
    ...uxEvidence.map(e=>({...e,section:'تجربه کاربری'})),
    ...a11yEvidence.map(e=>({...e,section:'دسترسی‌پذیری'})),
    ...mobileEvidence.map(e=>({...e,section:'موبایل'})),
    ...contentEvidence.map(e=>({...e,section:'محتوا'})),
    ...convEvidence.map(e=>({...e,section:'تبدیل'})),
    ...techEvidence.map(e=>({...e,section:'فنی'})),
    ...secEvidence.map(e=>({...e,section:'امنیت'})),
    ...trustEvidence.map(e=>({...e,section:'اعتماد'})),
  ];
  const priority = {critical:0,high:1,medium:2,low:3};
  allEvidence.sort((a,b)=>(priority[a.severity]||3)-(priority[b.severity]||3));

  const sorted = Object.entries(scores).sort(([,a],[,b])=>b-a);
  const perfLabel = perf>=75?'سریع':perf>=50?'متوسط':'کُند';
  const seoLabel = seo>=75?'قوی سئو':seo>=50?'سئو متوسط':'سئو ضعیف';
  const criticalCount = allEvidence.filter(e=>e.severity==='critical').length;

  return {
    scores, finalScore,
    instantVerdict: `این سایت ${perfLabel} با ${seoLabel} است — امتیاز ${finalScore}/100 با ${criticalCount} مشکل بحرانی`,
    strongest: { key:sorted[0][0], score:sorted[0][1] },
    weakest: { key:sorted[sorted.length-1][0], score:sorted[sorted.length-1][1] },
    allEvidence,
    perfBreakdown,
    seoEvidence, perfEvidence, uxEvidence, a11yEvidence, mobileEvidence,
    contentEvidence, convEvidence, techEvidence, secEvidence, trustEvidence,
    meta: {
      title, metaDesc, h1Count, h2Count, h3Count, imgCount, imgNoAlt, altRatio:+altRatio.toFixed(2),
      hasCanon, canonUrl, hasOG, hasTW, hasSchema, hasSitemap, isHttps,
      jsFiles, cssFiles, fontFiles, totalReqs, htmlKB, wordCount,
      hasLazy, hasGzip, hasBrotli, hasPreload, hasWebp,
      hasPricing, hasSocialProof, hasTrial, hasChat, hasAnalytics,
      fcp, lcp, cls, ttfb, loadTime,
      csp:!!csp, xFrame:!!xFrame, hsts:!!hsts, xContent:!!xContent,
      hasEnvVars, hasSourceMaps, hasConsoleLog,
    },
  };
}
