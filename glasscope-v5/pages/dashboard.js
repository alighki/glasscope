import { useState, useEffect } from 'react';
import Head from 'next/head';
import { GC, ScoreRing, sc, SECTION_NAMES_FA } from '../components/UI';
import Particles from '../components/Particles';

export default function Dashboard() {
  const [monitors, setMonitors] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(null);
  const [activeTab, setActiveTab] = useState('monitors');
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [userId] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('gs_uid') || (() => { const id = 'u_' + Math.random().toString(36).slice(2); localStorage.setItem('gs_uid', id); return id; })()) : 'anon');

  const headers = { 'Content-Type': 'application/json', 'x-user-id': userId };

  useEffect(() => { fetchMonitors(); fetchCompetitors(); }, []);

  async function fetchMonitors() {
    const r = await fetch('/api/monitor', { headers }).then(r => r.json());
    setMonitors(r.monitors || []);
  }

  async function fetchCompetitors() {
    const r = await fetch('/api/competitor', { headers }).then(r => r.json());
    setCompetitors(r.competitors || []);
  }

  async function addMonitor() {
    if (!newUrl.trim()) return;
    setLoading(true);
    const r = await fetch('/api/monitor', { method:'POST', headers, body: JSON.stringify({ action:'add', url: newUrl, schedule:'weekly' }) }).then(r => r.json());
    if (r.error) alert(r.error);
    else { setNewUrl(''); await fetchMonitors(); }
    setLoading(false);
  }

  async function checkMonitor(id) {
    setChecking(id);
    const r = await fetch('/api/monitor', { method:'POST', headers, body: JSON.stringify({ action:'check', monitorId: id }) }).then(r => r.json());
    if (r.error) alert(r.error);
    else await fetchMonitors();
    setChecking(null);
  }

  async function deleteMonitor(id) {
    await fetch('/api/monitor', { method:'POST', headers, body: JSON.stringify({ action:'delete', monitorId: id }) });
    await fetchMonitors();
  }

  async function addCompetitor() {
    if (!newCompUrl.trim()) return;
    setLoading(true);
    const r = await fetch('/api/competitor', { method:'POST', headers, body: JSON.stringify({ action:'add', url: newCompUrl }) }).then(r => r.json());
    if (r.error) alert(r.error);
    else { setNewCompUrl(''); await fetchCompetitors(); }
    setLoading(false);
  }

  async function analyzeCompetitor(competitorId) {
    setChecking(competitorId);
    const r = await fetch('/api/competitor', { method:'POST', headers, body: JSON.stringify({ action:'analyze', competitorId }) }).then(r => r.json());
    if (r.error) alert(r.error);
    else await fetchCompetitors();
    setChecking(null);
  }

  async function redeemPromo() {
    if (!promoCode.trim()) return;
    const r = await fetch('/api/promo', { method:'POST', headers, body: JSON.stringify({ action:'redeem', code: promoCode }) }).then(r => r.json());
    setPromoMsg(r.message || r.error || '');
  }

  const TABS = [
    { id:'monitors', label:'🔔 مانیتور سایت' },
    { id:'competitors', label:'⚔️ رقبا' },
    { id:'promo', label:'🎁 کد پاداش' },
  ];

  return (
    <>
      <Head><title>داشبورد — Glasscope</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
      <Particles/>
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', background:'radial-gradient(ellipse at 50% 0%,rgba(91,127,255,0.07) 0%,transparent 65%)' }}/>

      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2rem', height:64, position:'sticky', top:0, zIndex:100, background:'rgba(5,5,10,0.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'#F0F0F5' }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔭</div>
          <span style={{ fontSize:17, fontWeight:700 }}>Glasscope</span>
        </a>
        <a href="/" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#F0F0F5', padding:'7px 18px', borderRadius:9, fontSize:13, textDecoration:'none' }}>تحلیل جدید</a>
      </nav>

      <div dir="rtl" style={{ maxWidth:960, margin:'0 auto', padding:'40px 1.5rem 80px', position:'relative', zIndex:1 }}>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:8 }}>داشبورد</h1>
        <p style={{ color:'#8888A0', marginBottom:32 }}>مانیتورینگ مداوم و ردیابی رقبا</p>

        <div style={{ display:'flex', gap:6, marginBottom:28, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight: activeTab===t.id ? 700 : 400, cursor:'pointer', fontFamily:'inherit', border:'none', background: activeTab===t.id ? 'rgba(91,127,255,0.18)' : 'rgba(255,255,255,0.04)', color: activeTab===t.id ? '#5B7FFF' : '#8888A0' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MONITORS ── */}
        {activeTab === 'monitors' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <GC style={{ padding:20 }}>
              <div style={{ fontSize:13, color:'#8888A0', marginBottom:12 }}>سایت جدید برای مانیتور اضافه کن</div>
              <div style={{ display:'flex', gap:10 }}>
                <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMonitor()} placeholder="example.com" dir="ltr" style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 14px', color:'#F0F0F5', fontSize:14, outline:'none', fontFamily:'monospace' }}/>
                <button onClick={addMonitor} disabled={loading} style={{ background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', color:'#fff', border:'none', borderRadius:9, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: loading?0.6:1 }}>اضافه کن</button>
              </div>
            </GC>

            {monitors.length === 0 && <GC style={{ padding:40, textAlign:'center' }}><p style={{ color:'#44445A' }}>هنوز سایتی اضافه نشده</p></GC>}

            {monitors.map(m => (
              <GC key={m.id} style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:12, color:'#44445A', fontFamily:'monospace' }}>{m.url}</div>
                    {m.lastChecked && <div style={{ fontSize:11, color:'#44445A', marginTop:4 }}>آخرین بررسی: {new Date(m.lastChecked).toLocaleDateString('fa-IR')}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {m.lastScore && <span style={{ fontSize:28, fontWeight:800, color:sc(m.lastScore) }}>{m.lastScore}</span>}
                    <button onClick={() => checkMonitor(m.id)} disabled={checking===m.id} style={{ background:'rgba(91,127,255,0.15)', border:'1px solid rgba(91,127,255,0.3)', color:'#5B7FFF', padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', opacity: checking===m.id?0.6:1 }}>
                      {checking===m.id ? '...' : '🔄 بررسی'}
                    </button>
                    <button onClick={() => deleteMonitor(m.id)} style={{ background:'rgba(224,69,69,0.1)', border:'1px solid rgba(224,69,69,0.2)', color:'#E04545', padding:'7px 12px', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                  </div>
                </div>

                {m.alerts?.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                    {m.alerts.map((a,i) => (
                      <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', borderRadius:8, background: a.severity==='critical'?'rgba(224,69,69,0.1)':a.severity==='high'?'rgba(240,160,32,0.1)':'rgba(91,127,255,0.08)', fontSize:13, color: a.severity==='critical'?'#E04545':a.severity==='high'?'#F0A020':'#5B7FFF' }}>
                        {a.type==='score_drop'?'📉':a.type==='score_rise'?'📈':'⚠'} {a.msg}
                      </div>
                    ))}
                  </div>
                )}

                {m.history?.length > 1 && (
                  <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:48 }}>
                    {m.history.slice(0,10).reverse().map((h,i) => (
                      <div key={i} title={`${h.finalScore}/100`} style={{ flex:1, background:sc(h.finalScore), borderRadius:3, height: Math.max(8, (h.finalScore/100)*48), opacity:0.7 }}/>
                    ))}
                  </div>
                )}
              </GC>
            ))}
          </div>
        )}

        {/* ── COMPETITORS ── */}
        {activeTab === 'competitors' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <GC style={{ padding:20 }}>
              <div style={{ fontSize:13, color:'#8888A0', marginBottom:12 }}>رقیب جدید اضافه کن</div>
              <div style={{ display:'flex', gap:10 }}>
                <input value={newCompUrl} onChange={e=>setNewCompUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCompetitor()} placeholder="competitor.com" dir="ltr" style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'10px 14px', color:'#F0F0F5', fontSize:14, outline:'none', fontFamily:'monospace' }}/>
                <button onClick={addCompetitor} disabled={loading} style={{ background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', color:'#fff', border:'none', borderRadius:9, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>اضافه کن</button>
              </div>
            </GC>

            {competitors.length === 0 && <GC style={{ padding:40, textAlign:'center' }}><p style={{ color:'#44445A' }}>هنوز رقیبی اضافه نشده</p></GC>}

            {competitors.map(c => (
              <GC key={c.id} style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom: c.lastScore ? 16 : 0 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>{c.url.replace(/https?:\/\//,'').split('/')[0]}</div>
                    {c.lastChecked && <div style={{ fontSize:11, color:'#44445A' }}>آخرین بررسی: {new Date(c.lastChecked).toLocaleDateString('fa-IR')}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {c.lastScore && <span style={{ fontSize:24, fontWeight:800, color:sc(c.lastScore) }}>{c.lastScore}</span>}
                    <button onClick={() => analyzeCompetitor(c.id)} disabled={checking===c.id} style={{ background:'rgba(91,127,255,0.15)', border:'1px solid rgba(91,127,255,0.3)', color:'#5B7FFF', padding:'7px 14px', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', opacity: checking===c.id?0.6:1 }}>
                      {checking===c.id ? '...' : '🔍 آنالیز'}
                    </button>
                    <button onClick={() => { Competitors?.delete?.(c.id); fetchCompetitors(); }} style={{ background:'rgba(224,69,69,0.1)', border:'1px solid rgba(224,69,69,0.2)', color:'#E04545', padding:'7px 12px', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                  </div>
                </div>
                {c.history?.length > 0 && (
                  <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:36, marginTop:8 }}>
                    {c.history.slice(0,10).reverse().map((h,i) => (
                      <div key={i} title={`${h.score}/100`} style={{ flex:1, background:sc(h.score), borderRadius:2, height: Math.max(6, (h.score/100)*36), opacity:0.65 }}/>
                    ))}
                  </div>
                )}
              </GC>
            ))}
          </div>
        )}

        {/* ── PROMO ── */}
        {activeTab === 'promo' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <GC style={{ padding:32, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16 }}>🎁</div>
              <h2 style={{ fontSize:22, fontWeight:800, marginBottom:10 }}>کد پاداش دارید؟</h2>
              <p style={{ color:'#8888A0', marginBottom:24, lineHeight:1.7 }}>با وارد کردن کد پاداش، یک ماه دسترسی نامحدود Premium دریافت کنید.</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} placeholder="GLS-XXXX-XXXX-XXXX" dir="ltr" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'12px 18px', color:'#F0F0F5', fontSize:15, outline:'none', fontFamily:'monospace', letterSpacing:'0.08em', width:280 }}/>
                <button onClick={redeemPromo} style={{ background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>فعال‌سازی</button>
              </div>
              {promoMsg && (
                <div style={{ marginTop:20, padding:'12px 20px', borderRadius:10, background: promoMsg.includes('🎉')?'rgba(34,212,106,0.1)':'rgba(224,69,69,0.1)', border:`1px solid ${promoMsg.includes('🎉')?'rgba(34,212,106,0.25)':'rgba(224,69,69,0.25)'}`, color: promoMsg.includes('🎉')?'#22D46A':'#E04545', fontSize:14 }}>
                  {promoMsg}
                </div>
              )}
            </GC>
          </div>
        )}
      </div>
    </>
  );
}
