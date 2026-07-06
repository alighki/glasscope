import { useEffect, useState } from 'react';
import Head from 'next/head';
import { GC, ScoreRing, SeverityBadge, sc, SECTION_NAMES_FA } from '../../components/UI';

export default function PublicReport({ id }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/report?id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setReport(d); })
      .catch(() => setError('خطا در بارگذاری گزارش'))
      .finally(() => setLoading(false));
  }, [id]);

  const domain = report?.url?.replace(/https?:\/\//, '').split('/')[0] || '';

  return (
    <>
      <Head>
        <title>{domain ? `گزارش ${domain} — Glasscope` : 'Glasscope Report'}</title>
        <meta name="description" content={`تحلیل جامع وب‌سایت ${domain} با امتیاز ${report?.finalScore}/100`}/>
        <meta property="og:title" content={`${domain} — امتیاز ${report?.finalScore}/100`}/>
        <meta property="og:description" content={report?.instantVerdict || ''}/>
        <meta property="og:type" content="website"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
      </Head>
      <div dir="rtl" style={{ minHeight:'100vh', background:'#05050A', color:'#F0F0F5', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
        <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2rem', height:60, borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(5,5,10,0.9)' }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', color:'inherit' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔭</div>
            <span style={{ fontSize:17, fontWeight:700 }}>Glasscope</span>
          </a>
          <a href="/" style={{ background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', color:'#fff', padding:'7px 18px', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>تحلیل سایت خودت</a>
        </nav>

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#5B7FFF', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        )}

        {error && <div style={{ textAlign:'center', padding:80, color:'#E04545' }}>{error}</div>}

        {report && (
          <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 1.5rem 80px' }}>
            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>{domain}</h1>
              <div style={{ display:'inline-block', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 14px', fontSize:13, color:'#8888A0' }}>
                💬 {report.instantVerdict}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: report.screenshot ? '180px 1fr' : '1fr', gap:20, marginBottom:28 }}>
              <GC style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <ScoreRing score={report.finalScore} size={120} label="امتیاز کلی"/>
                <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:7 }}>
                  {Object.entries(report.scores || {}).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:90, fontSize:10, color:'#8888A0', textAlign:'right', flexShrink:0 }}>{SECTION_NAMES_FA[k]||k}</span>
                      <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:v+'%', background:sc(v), borderRadius:2 }}/>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:sc(v), width:22 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </GC>
              {report.screenshot && (
                <GC style={{ overflow:'hidden', padding:14 }}>
                  <img src={report.screenshot} alt={`screenshot of ${domain}`} style={{ width:'100%', borderRadius:9, display:'block' }}/>
                </GC>
              )}
            </div>

            {report.allEvidence?.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#44445A', letterSpacing:'0.1em', textTransform:'uppercase', paddingBottom:12, marginBottom:14, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>مشکلات شناسایی‌شده</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {report.allEvidence.slice(0, 10).map((e,i) => (
                    <GC key={i} style={{ display:'flex', gap:10, padding:'12px 16px', alignItems:'flex-start' }}>
                      <SeverityBadge severity={e.severity} lang="fa"/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, marginBottom:3 }}>{e.msg}</div>
                        <div style={{ fontSize:11, color:'#5B7FFF' }}>💡 {e.fix}</div>
                      </div>
                    </GC>
                  ))}
                </div>
              </div>
            )}

            <GC style={{ padding:24, background:'rgba(91,127,255,0.06)', border:'1px solid rgba(91,127,255,0.2)', textAlign:'center' }}>
              <p style={{ fontSize:15, marginBottom:16 }}>این گزارش توسط <strong>Glasscope</strong> تولید شده</p>
              <a href="/" style={{ display:'inline-block', background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)', color:'#fff', padding:'11px 28px', borderRadius:11, fontSize:14, fontWeight:700, textDecoration:'none' }}>سایت خودت را تحلیل کن ←</a>
            </GC>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}

export async function getServerSideProps(ctx) {
  return { props: { id: ctx.params.id || null } };
}
