// ══ In-Memory Store — Production: replace with PostgreSQL + Redis ══
// All data persists in-process memory (resets on restart)
// Interface is database-ready: swap implementations without changing callers

const db = {
  users: new Map(),
  reports: new Map(),
  monitors: new Map(),
  monitorHistory: new Map(),  // monitorId -> [{date, scores, issues}]
  competitors: new Map(),
  promos: new Map(),
  analytics: [],
  usage: new Map(),
};

// ── Users ─────────────────────────────────────────────────────────
export const Users = {
  get: (id) => db.users.get(id) || null,
  getByIP: (ip) => [...db.users.values()].find(u => u.ip === ip) || null,
  upsert: (id, data) => { db.users.set(id, { id, createdAt: Date.now(), ...db.users.get(id), ...data, updatedAt: Date.now() }); return db.users.get(id); },
  all: () => [...db.users.values()],
};

// ── Reports (Shareable) ───────────────────────────────────────────
export const Reports = {
  save: (id, data) => { db.reports.set(id, { ...data, id, savedAt: Date.now(), public: true }); return db.reports.get(id); },
  get: (id) => db.reports.get(id) || null,
  all: () => [...db.reports.values()],
  delete: (id) => db.reports.delete(id),
};

// ── Monitors (Website Health Tracking) ───────────────────────────
export const Monitors = {
  create: (data) => {
    const id = `mon_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    db.monitors.set(id, { ...data, id, createdAt: Date.now(), lastChecked: null, status: 'active' });
    db.monitorHistory.set(id, []);
    return db.monitors.get(id);
  },
  get: (id) => db.monitors.get(id) || null,
  getByUser: (userId) => [...db.monitors.values()].filter(m => m.userId === userId),
  update: (id, data) => { if (!db.monitors.has(id)) return null; db.monitors.set(id, { ...db.monitors.get(id), ...data, updatedAt: Date.now() }); return db.monitors.get(id); },
  delete: (id) => { db.monitors.delete(id); db.monitorHistory.delete(id); },
  all: () => [...db.monitors.values()],

  // History
  addHistory: (id, entry) => {
    const hist = db.monitorHistory.get(id) || [];
    hist.unshift({ ...entry, recordedAt: Date.now() });
    db.monitorHistory.set(id, hist.slice(0, 90)); // keep 90 snapshots max
  },
  getHistory: (id, limit = 30) => (db.monitorHistory.get(id) || []).slice(0, limit),

  // Score change detection
  detectChanges: (id) => {
    const hist = db.monitorHistory.get(id) || [];
    if (hist.length < 2) return [];
    const [latest, prev] = hist;
    const alerts = [];
    for (const [k, v] of Object.entries(latest.scores || {})) {
      const pv = prev.scores?.[k];
      if (pv == null) continue;
      const diff = v - pv;
      if (diff <= -10) alerts.push({ type: 'score_drop', section: k, diff, severity: diff <= -20 ? 'critical' : 'high', msg: `${k} ${Math.abs(diff)} امتیاز افت کرد` });
      if (diff >= 10) alerts.push({ type: 'score_rise', section: k, diff, severity: 'info', msg: `${k} ${diff} امتیاز بهبود یافت` });
    }
    const newCritical = (latest.criticalCount || 0) - (prev.criticalCount || 0);
    if (newCritical > 0) alerts.push({ type: 'new_critical', diff: newCritical, severity: 'critical', msg: `${newCritical} مشکل بحرانی جدید شناسایی شد` });
    return alerts;
  },
};

// ── Competitors ───────────────────────────────────────────────────
export const Competitors = {
  add: (userId, url) => {
    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    db.competitors.set(id, { id, userId, url, history: [], createdAt: Date.now() });
    return db.competitors.get(id);
  },
  getByUser: (userId) => [...db.competitors.values()].filter(c => c.userId === userId),
  update: (id, data) => { if (!db.competitors.has(id)) return null; db.competitors.set(id, { ...db.competitors.get(id), ...data }); return db.competitors.get(id); },
  delete: (id) => db.competitors.delete(id),
};

// ── Promo Codes ───────────────────────────────────────────────────
import crypto from 'crypto';
export const Promos = {
  generate: (userId, campaign = 'reward', daysValid = 30) => {
    const raw = `GLS-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    const id = `promo_${Date.now()}`;
    db.promos.set(id, { id, hashed, userId, campaign, status: 'active', createdAt: Date.now(), expiresAt: Date.now() + daysValid * 86400000, redeemedAt: null, redeemedBy: null });
    return { id, code: raw, expiresAt: db.promos.get(id).expiresAt };
  },
  validate: (code) => {
    const hashed = crypto.createHash('sha256').update(code).digest('hex');
    const promo = [...db.promos.values()].find(p => p.hashed === hashed);
    if (!promo) return { valid: false, reason: 'کد وجود ندارد' };
    if (promo.status !== 'active') return { valid: false, reason: `کد ${promo.status === 'redeemed' ? 'قبلاً استفاده شده' : 'منقضی شده'} است` };
    if (Date.now() > promo.expiresAt) { db.promos.set(promo.id, { ...promo, status: 'expired' }); return { valid: false, reason: 'کد منقضی شده است' }; }
    return { valid: true, promo };
  },
  redeem: (code, userId) => {
    const { valid, promo, reason } = Promos.validate(code);
    if (!valid) return { success: false, reason };
    db.promos.set(promo.id, { ...promo, status: 'redeemed', redeemedAt: Date.now(), redeemedBy: userId });
    Users.upsert(userId, { plan: 'premium', planExpiry: Date.now() + 30 * 86400000, rewardedAt: Date.now() });
    return { success: true, daysGranted: 30, expiry: Date.now() + 30 * 86400000 };
  },
  getByUser: (userId) => [...db.promos.values()].filter(p => p.userId === userId),
  all: () => [...db.promos.values()],
};

function randomSegment(len) {
  return crypto.randomBytes(len).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0, len);
}

// ── Usage / Rate Limiting ─────────────────────────────────────────
export const Usage = {
  get: (key) => db.usage.get(key) || { count: 0, reset: Date.now() + 60000 },
  increment: (key, windowMs = 60000, max = 10) => {
    const now = Date.now();
    const entry = db.usage.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    db.usage.set(key, entry);
    if (entry.count > max) throw { status: 429, message: `تعداد درخواست بیش از حد. ${Math.ceil((entry.reset - now)/1000)} ثانیه صبر کنید.` };
    return { remaining: Math.max(0, max - entry.count) };
  },
};

// ── Analytics Events ──────────────────────────────────────────────
export const Analytics = {
  track: (event, data = {}) => { db.analytics.push({ event, ...data, ts: Date.now() }); if (db.analytics.length > 10000) db.analytics.shift(); },
  funnel: () => {
    const events = db.analytics;
    return {
      landingVisits: events.filter(e => e.event === 'page_view').length,
      analyzeClicks: events.filter(e => e.event === 'analyze_start').length,
      analyzeComplete: events.filter(e => e.event === 'analyze_complete').length,
      reportShares: events.filter(e => e.event === 'report_share').length,
      promoRedeemed: events.filter(e => e.event === 'promo_redeemed').length,
    };
  },
  recent: (n = 100) => db.analytics.slice(-n),
};

// ── Cache ─────────────────────────────────────────────────────────
const cache = new Map();
export const Cache = {
  get: (key) => { const e = cache.get(key); if (!e) return null; if (Date.now() > e.exp) { cache.delete(key); return null; } return e.data; },
  set: (key, data, ttlMs = 86400000) => cache.set(key, { data, exp: Date.now() + ttlMs, at: new Date().toISOString() }),
  del: (key) => cache.delete(key),
  info: (key) => { const e = cache.get(key); return e ? { cachedAt: e.at, expiresIn: Math.round((e.exp - Date.now()) / 60000) + ' min' } : null; },
};

// ── Benchmark Data ────────────────────────────────────────────────
const BENCH = {
  saas:       { fcp:[800,1200,1800,2800,4200], lcp:[1200,1800,2500,3800,5500], ttfb:[200,400,800,1400,2200] },
  ecommerce:  { fcp:[900,1400,2000,3200,4800], lcp:[1400,2000,2800,4200,6000], ttfb:[300,500,900,1600,2500] },
  blog:       { fcp:[600,900,1400,2200,3500],  lcp:[1000,1500,2200,3500,5000], ttfb:[150,300,600,1200,2000] },
  corporate:  { fcp:[700,1100,1700,2600,4000], lcp:[1100,1700,2400,3700,5300], ttfb:[250,450,850,1500,2400] },
  startup:    { fcp:[750,1100,1700,2600,4000], lcp:[1100,1600,2400,3600,5200], ttfb:[200,400,800,1400,2200] },
  news:       { fcp:[800,1300,1900,3000,4500], lcp:[1300,1900,2700,4000,5700], ttfb:[300,500,900,1600,2500] },
};
export const Benchmark = {
  getPercentile: (val, metric, industry = 'saas') => {
    const data = BENCH[industry]?.[metric] || BENCH.saas[metric];
    if (!data || val == null) return null;
    if (val <= data[0]) return 95;
    if (val <= data[1]) return 80;
    if (val <= data[2]) return 60;
    if (val <= data[3]) return 35;
    if (val <= data[4]) return 15;
    return 5;
  },
  getLabel: (p, lowerBetter = true) => {
    if (p == null) return null;
    const eff = lowerBetter ? p : 100 - p;
    if (eff >= 80) return { label: `بهتر از ${eff}٪ سایت‌ها`, color: '#22D46A' };
    if (eff >= 60) return { label: `بهتر از ${eff}٪ سایت‌ها`, color: '#38BDF8' };
    if (eff >= 35) return { label: `بهتر از ${eff}٪ سایت‌ها`, color: '#F0A020' };
    return { label: `بدتر از ${100-eff}٪ سایت‌ها`, color: '#E04545' };
  },
  industries: ['saas','ecommerce','blog','corporate','startup','news'],
};
