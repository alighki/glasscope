// ══ Stack Detector v2 — 35+ Technologies ════════════════════════

export function detectStack(html, scripts, styles, headers = {}, networkRequests = []) {
  const h = html.toLowerCase();
  const sc = scripts.join(' ').toLowerCase();
  const st = styles.join(' ').toLowerCase();
  const srv = (headers['server'] || '').toLowerCase();
  const xpb = (headers['x-powered-by'] || '').toLowerCase();
  const nr = networkRequests.join(' ').toLowerCase();

  const checks = [
    // ── Frameworks ──────────────────────────────────
    { name:'React', cat:'framework', color:'#61DAFB', sig:[h.includes('__reactfiber')||h.includes('_reactrootcontainer'),sc.includes('react.production'),h.includes('data-reactroot')] },
    { name:'Next.js', cat:'framework', color:'#fff', sig:[h.includes('__next_data__'),sc.includes('/_next/'),h.includes('__next_f')] },
    { name:'Vue.js', cat:'framework', color:'#42B883', sig:[h.includes('__vue__'),h.includes('v-app'),sc.includes('vue.runtime')] },
    { name:'Nuxt.js', cat:'framework', color:'#00DC82', sig:[h.includes('__nuxt'),h.includes('_nuxt/')] },
    { name:'Angular', cat:'framework', color:'#DD0031', sig:[h.includes('ng-version'),h.includes('ng-app'),sc.includes('angular')] },
    { name:'Svelte', cat:'framework', color:'#FF3E00', sig:[h.includes('svelte-'),sc.includes('svelte')] },
    { name:'Gatsby', cat:'framework', color:'#663399', sig:[h.includes('___gatsby'),h.includes('gatsby-')] },
    { name:'Remix', cat:'framework', color:'#3992FF', sig:[h.includes('__remixcontext'),h.includes('"remix"')] },
    { name:'Astro', cat:'framework', color:'#FF5D01', sig:[h.includes('astro-island'),h.includes('data-astro')] },
    // ── UI Libraries ──────────────────────────────────
    { name:'Tailwind CSS', cat:'ui', color:'#38BDF8', sig:[h.includes('tailwind'),st.includes('tailwind'),/class="[^"]*(?:flex |grid |p-\d|m-\d|text-\w+|bg-\w+)[^"]*"/.test(html.slice(0,5000))] },
    { name:'Bootstrap', cat:'ui', color:'#7952B3', sig:[st.includes('bootstrap'),h.includes('class="container'),h.includes('btn btn-')] },
    { name:'Material UI', cat:'ui', color:'#007FFF', sig:[h.includes('muibutton'),h.includes('makestyles'),sc.includes('@mui')] },
    { name:'Framer Motion', cat:'ui', color:'#E535AB', sig:[h.includes('framer'),sc.includes('framer-motion')] },
    { name:'Chakra UI', cat:'ui', color:'#319795', sig:[h.includes('chakra'),sc.includes('@chakra')] },
    // ── JS Libraries ──────────────────────────────────
    { name:'jQuery', cat:'lib', color:'#0769AD', sig:[sc.includes('jquery'),h.includes('$.ajax'),h.includes('$(document)')] },
    { name:'GSAP', cat:'animation', color:'#88CE02', sig:[h.includes('gsap'),sc.includes('gsap.min'),nr.includes('gsap')] },
    { name:'Three.js', cat:'3d', color:'#049EF4', sig:[h.includes('three.js'),sc.includes('three.min'),nr.includes('threejs')] },
    { name:'Alpine.js', cat:'lib', color:'#77C1D2', sig:[h.includes('x-data'),h.includes('x-show'),sc.includes('alpinejs')] },
    // ── Analytics ──────────────────────────────────
    { name:'Google Analytics 4', cat:'analytics', color:'#E37400', sig:[h.includes("gtag('config'"),h.includes('google-analytics.com/g/'),nr.includes('google-analytics')] },
    { name:'Google Tag Manager', cat:'analytics', color:'#4285F4', sig:[h.includes('googletagmanager'),h.includes('gtm.js')] },
    { name:'Hotjar', cat:'analytics', color:'#FD3A5C', sig:[h.includes('hotjar'),h.includes('hjsv')] },
    { name:'Mixpanel', cat:'analytics', color:'#7856FF', sig:[h.includes('mixpanel'),nr.includes('mixpanel')] },
    { name:'Segment', cat:'analytics', color:'#52BD94', sig:[h.includes('segment.com'),h.includes('analytics.js')] },
    { name:'Microsoft Clarity', cat:'analytics', color:'#0078D4', sig:[h.includes('clarity.ms'),nr.includes('clarity')] },
    // ── Payments ──────────────────────────────────
    { name:'Stripe', cat:'payment', color:'#635BFF', sig:[h.includes('js.stripe.com'),h.includes('stripe.js'),nr.includes('stripe')] },
    { name:'PayPal', cat:'payment', color:'#003087', sig:[h.includes('paypal'),nr.includes('paypal')] },
    { name:'Paddle', cat:'payment', color:'#006EFF', sig:[h.includes('paddle.com'),nr.includes('paddle')] },
    // ── CMS ──────────────────────────────────
    { name:'WordPress', cat:'cms', color:'#21759B', sig:[h.includes('wp-content'),h.includes('wp-includes'),h.includes('wp-json')] },
    { name:'Webflow', cat:'cms', color:'#4353FF', sig:[h.includes('webflow'),h.includes('wf-')] },
    { name:'Shopify', cat:'ecommerce', color:'#95BF47', sig:[h.includes('shopify'),h.includes('myshopify')] },
    // ── Customer Support ──────────────────────────────────
    { name:'Intercom', cat:'support', color:'#1F8EED', sig:[h.includes('intercom'),nr.includes('intercom')] },
    { name:'Zendesk', cat:'support', color:'#03363D', sig:[h.includes('zendesk'),nr.includes('zendesk')] },
    { name:'Crisp', cat:'support', color:'#1972F5', sig:[h.includes('crisp.chat')] },
    // ── Hosting ──────────────────────────────────
    { name:'Vercel', cat:'hosting', color:'#fff', sig:[srv.includes('vercel'),h.includes('_vercel'),headers['x-vercel-id']] },
    { name:'Netlify', cat:'hosting', color:'#00C7B7', sig:[srv.includes('netlify'),headers['x-nf-request-id']] },
    { name:'Cloudflare', cat:'cdn', color:'#F38020', sig:[srv.includes('cloudflare'),headers['cf-ray'],headers['cf-cache-status']] },
    { name:'AWS CloudFront', cat:'cdn', color:'#FF9900', sig:[headers['x-amz-cf-id'],headers['x-amzn-requestid']] },
  ];

  const detected = checks.map(c => ({
    ...c,
    confidence: Math.round((c.sig.filter(Boolean).length / c.sig.length) * 100),
    signals: c.sig.filter(Boolean).length,
    totalSignals: c.sig.length,
  })).filter(c => c.confidence > 0).sort((a,b) => b.confidence - a.confidence);

  // ── Rendering Strategy ──────────────────────────────────
  const hasNext = detected.find(d=>d.name==='Next.js');
  const hasNuxt = detected.find(d=>d.name==='Nuxt.js');
  const hasGatsby = detected.find(d=>d.name==='Gatsby');
  const hasAstro = detected.find(d=>d.name==='Astro');
  const hasReact = detected.find(d=>d.name==='React');
  const hasWP = detected.find(d=>d.name==='WordPress');
  const hasRemix = detected.find(d=>d.name==='Remix');

  let renderStrategy = 'Traditional SSR';
  let renderDetail = 'Server-rendered HTML';
  if (hasNext) { renderStrategy = 'SSR / ISR'; renderDetail = 'Next.js با هیدراسیون کلاینت'; }
  else if (hasNuxt) { renderStrategy = 'SSR'; renderDetail = 'Nuxt.js Vue SSR'; }
  else if (hasGatsby) { renderStrategy = 'SSG'; renderDetail = 'Gatsby Static Site Generation'; }
  else if (hasAstro) { renderStrategy = 'SSG + Islands'; renderDetail = 'Astro با جزایر تعاملی'; }
  else if (hasRemix) { renderStrategy = 'SSR'; renderDetail = 'Remix با loader functions'; }
  else if (hasReact) { renderStrategy = 'CSR'; renderDetail = 'React SPA با client-side routing'; }
  else if (hasWP) { renderStrategy = 'Server PHP'; renderDetail = 'WordPress PHP rendering'; }
  else if (xpb.includes('php')) { renderStrategy = 'Server PHP'; renderDetail = 'PHP application'; }
  else if (xpb.includes('python') || xpb.includes('django')) { renderStrategy = 'Server Python'; renderDetail = 'Python/Django rendering'; }
  else if (xpb.includes('ruby')) { renderStrategy = 'Server Ruby'; renderDetail = 'Ruby on Rails'; }

  // ── Tech Debt Inference ──────────────────────────────────
  const techDebt = [];
  if (detected.find(d=>d.name==='jQuery') && (hasReact||detected.find(d=>d.name==='Vue.js'))) techDebt.push({ severity:'high', msg:'jQuery + Modern Framework — تداخل فریم‌ورک‌ها وجود دارد' });
  if (detected.filter(d=>d.cat==='analytics').length > 3) techDebt.push({ severity:'medium', msg:`${detected.filter(d=>d.cat==='analytics').length} ابزار analytics — بار غیرضروری` });
  if (detected.filter(d=>d.cat==='support').length > 1) techDebt.push({ severity:'low', msg:'چندین ابزار پشتیبانی — consolidation توصیه می‌شود' });

  return { detected, renderStrategy, renderDetail, techDebt };
}
