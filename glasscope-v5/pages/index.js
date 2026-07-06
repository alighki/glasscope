import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Particles from '../components/Particles';
import { GC, STL, ScoreRing, SeverityBadge, sc, vt, SECTION_NAMES_FA, SECTION_NAMES_EN } from '../components/UI';
import { translations } from '../lib/i18n';

const FREE_LIMIT = 3;
const getUsage = () => typeof window==='undefined'?0:parseInt(localStorage.getItem('gs4_usage')||'0');
const saveUsage = n => typeof window!=='undefined'&&localStorage.setItem('gs4_usage',n);
const getLang = () => typeof window==='undefined'?'fa':(localStorage.getItem('gs4_lang')||'fa');
const saveLang = l => typeof window!=='undefined'&&localStorage.setItem('gs4_lang',l);

export default function Home() {
  const [lang, setLang] = useState('fa');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [showPW, setShowPW] = useState(false);
  const [usage, setUsage] = useState(0);
  const [activeTab, setActiveTab] = useState('summary');
  const reportRef = useRef();
  const inputRef = useRef();

  useEffect(() => { setUsage(getUsage()); setLang(getLang()); }, []);

  const T = translations[lang];
  const dir = lang==='fa'?'rtl':'ltr';
  const SECTION_NAMES = lang==='fa'?SECTION_NAMES_FA:SECTION_NAMES_EN;

  function toggleLang() {
    const next = lang==='fa'?'en':'fa';
    setLang(next); saveLang(next);
  }

  const STEPS = T.steps.map((text,i)=>({icon:['🌐','📸','⚡','🔬','📊','🧠'][i],text}));

  async function analyze() {
    if (!url.trim()) { inputRef.current?.focus(); return; }
    const cu = getUsage();
    if (cu >= FREE_LIMIT) { setShowPW(true); return; }
    setLoading(true); setReport(null); setError(''); setStep(0); setActiveTab('summary');
    const stepTimer = setInterval(()=>setStep(s=>Math.min(s+1,STEPS.length-1)), 1800);
    try {
      const fullUrl = url.startsWith('http')?url:'https://'+url;
      const res = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:fullUrl})});
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const nu=cu+1; saveUsage(nu); setUsage(nu);
      clearInterval(stepTimer); setStep(STEPS.length-1);
      await new Promise(r=>setTimeout(r,400));
      setReport(data);
      setTimeout(()=>reportRef.current?.scrollIntoView({behavior:'smooth'}),150);
    } catch(e) { clearInterval(stepTimer); setError(e.message); }
    setLoading(false);
  }

  function exportJSON() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`glasscope-${Date.now()}.json`; a.click();
  }

  const left = Math.max(0, FREE_LIMIT - usage);
  const domain = url.replace(/https?:\/\//,'').split('/')[0];

  const TABS = [
    {id:'summary',label:T.tabs.summary},
    {id:'seo',label:T.tabs.seo},
    {id:'performance',label:T.tabs.performance},
    {id:'security',label:T.tabs.security},
    {id:'stack',label:T.tabs.stack},
    {id:'issues',label:T.tabs.issues},
    {id:'pages',label:T.tabs.pages},
  ];

  return (
    <div dir={dir} style={{minHeight:'100vh'}}>
      <Head>
        <title>{T.siteTitle}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={T.heroSub}/>
      </Head>

      <Particles/>
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',background:'radial-gradient(ellipse at 50% 0%,rgba(91,127,255,0.07) 0%,transparent 65%)'}}/>

      {/* ════ NAV ════ */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 2rem',height:64,position:'sticky',top:0,zIndex:100,background:'rgba(5,5,10,0.75)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 0 20px rgba(91,127,255,0.4)'}}>🔭</div>
          <span style={{fontSize:18,fontWeight:700,letterSpacing:'-0.5px'}}>Glasscope</span>
          <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(91,127,255,0.12)',border:'1px solid rgba(91,127,255,0.2)',color:'#5B7FFF',fontWeight:600}}>v5.0</span>
          <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'rgba(91,127,255,0.12)',border:'1px solid rgba(91,127,255,0.2)',color:'#5B7FFF',fontWeight:600}}>v4.0</span>
        </div>
        <a href="/dashboard" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#8888A0",padding:"7px 14px",borderRadius:10,fontSize:13,textDecoration:"none",marginLeft:8}}>📊 داشبورد</a>
        <button onClick={toggleLang} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#8888A0',padding:'7px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600}}>
          🌐 {T.langToggle}
        </button>
      </nav>

      {/* ════ HERO ════ */}
      {!report && !loading && (
        <section style={{minHeight:'88vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 2rem',textAlign:'center',position:'relative',zIndex:1}}>
          <div style={{position:'absolute',top:'15%',left:'15%',width:500,height:500,borderRadius:'50%',background:'rgba(91,127,255,0.03)',filter:'blur(100px)',pointerEvents:'none'}}/>

          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(34,212,106,0.08)',border:'1px solid rgba(34,212,106,0.2)',borderRadius:20,padding:'5px 16px',marginBottom:28,fontSize:12,color:'#22D46A',fontWeight:500}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#22D46A',animation:'pulse 2s infinite',display:'inline-block'}}/>
            {lang==='fa'?'بدون API خارجی — تحلیل ۴ صفحه + شواهد عددی':'No external API — 4-page analysis + numerical evidence'}
          </div>

          <h1 style={{fontSize:'clamp(38px,5.5vw,72px)',fontWeight:800,letterSpacing:'-3px',lineHeight:1.05,marginBottom:20,maxWidth:820}}>
            <span style={{background:'linear-gradient(135deg,#fff 0%,#8B9FFF 55%,#C084FC 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{T.heroTitle}</span>
          </h1>
          <p style={{fontSize:17,color:'#8888A0',maxWidth:560,margin:'0 auto 16px',lineHeight:1.8}}>{T.heroSub}</p>

          <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',marginBottom:40}}>
            {(lang==='fa'?['🔬 ۱۲ شاخص','📄 ۴ صفحه crawl','🔐 بدون API','⚡ شواهد عددی','🏗 ۳۵+ فناوری','🔒 امنیت عمیق']:['🔬 12 Metrics','📄 4-page crawl','🔐 No API','⚡ Numerical evidence','🏗 35+ tech','🔒 Deep security']).map((f,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'7px 14px',fontSize:12,color:'#8888A0'}}>{f}</div>
            ))}
          </div>

          <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:14,fontSize:12,color:'#8888A0'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:left===0?'#E04545':left===1?'#F0A020':'#22D46A'}}/>
            {left===0?T.freeLimit:`${left} ${lang==='fa'?'از':'of'} ${FREE_LIMIT} ${lang==='fa'?'تحلیل رایگان باقی‌مانده':'free analyses remaining'}`}
          </div>

          <div style={{maxWidth:660,width:'100%',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:16,padding:'8px 8px 8px 24px',gap:12,boxShadow:'0 8px 40px rgba(0,0,0,0.3)'}}>
              <span style={{color:'#44445A',fontSize:13,fontFamily:'monospace',flexShrink:0}}>https://</span>
              <input ref={inputRef} style={{flex:1,background:'none',border:'none',outline:'none',color:'#F0F0F5',fontSize:15,fontFamily:'monospace',minWidth:0}} placeholder="example.com" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} dir="ltr"/>
              <button onClick={analyze} style={{background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)',color:'#fff',border:'none',borderRadius:12,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,boxShadow:'0 4px 20px rgba(91,127,255,0.4)'}}>{T.analyzeBtn} {dir==='rtl'?'←':'→'}</button>
            </div>
          </div>
          <p style={{fontSize:12,color:'#44445A',marginTop:12}}>{lang==='fa'?'نتیجه در ۳۰-۴۵ ثانیه':'Result in 30-45 seconds'} — {T.noSignup}</p>
        </section>
      )}

      {/* ════ LOADING ════ */}
      {loading && (
        <section style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 2rem',position:'relative',zIndex:1}}>
          <GC style={{maxWidth:460,width:'100%',padding:48,textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:'50%',border:'3px solid rgba(255,255,255,0.06)',borderTopColor:'#5B7FFF',animation:'spin 0.85s linear infinite',margin:'0 auto 20px'}}/>
            <p style={{fontSize:13,color:'#8888A0',marginBottom:28}}>{STEPS[step].text}</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,textAlign:dir==='rtl'?'right':'left'}}>
              {STEPS.map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 10px',borderRadius:10,background:i===step?'rgba(91,127,255,0.07)':'transparent',transition:'background 0.3s'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,background:i<step?'rgba(34,212,106,0.12)':i===step?'rgba(91,127,255,0.12)':'rgba(255,255,255,0.03)',color:i<step?'#22D46A':i===step?'#5B7FFF':'#44445A',transition:'all 0.3s'}}>{i<step?'✓':s.icon}</div>
                  <span style={{fontSize:12,color:i<step?'#22D46A':i===step?'#F0F0F5':'#44445A',transition:'color 0.3s'}}>{s.text}</span>
                </div>
              ))}
            </div>
          </GC>
        </section>
      )}

      {/* ════ ERROR ════ */}
      {error && (
        <section style={{display:'flex',justifyContent:'center',padding:'60px 2rem',position:'relative',zIndex:1}}>
          <GC style={{maxWidth:420,textAlign:'center',padding:40}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠</div>
            <h3 style={{marginBottom:8,color:'#E04545'}}>{lang==='fa'?'خطا در آنالیز':'Analysis Error'}</h3>
            <p style={{color:'#8888A0',fontSize:13,lineHeight:1.7,marginBottom:20}}>{error}</p>
            <button style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#F0F0F5',padding:'10px 20px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13}} onClick={()=>setError('')}>{lang==='fa'?'دوباره امتحان':'Try again'}</button>
          </GC>
        </section>
      )}

      {/* ════════════ REPORT ════════════ */}
      {report && (
        <div ref={reportRef} style={{maxWidth:1060,margin:'0 auto',padding:'0 1.5rem 100px',position:'relative',zIndex:1}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16,padding:'36px 0 28px',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:28}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                <h2 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.5px'}}>{domain||url}</h2>
                {report.usedPlaywright&&<span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'rgba(34,212,106,0.1)',border:'1px solid rgba(34,212,106,0.2)',color:'#22D46A',fontWeight:600}}>Playwright ✓</span>}
                <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'rgba(91,127,255,0.1)',border:'1px solid rgba(91,127,255,0.2)',color:'#5B7FFF',fontWeight:600}}>{report.crawlInfo?.pageCount||1} {T.pagesAnalyzed}</span>
                {report.fromCache&&<span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:'rgba(240,160,32,0.1)',border:'1px solid rgba(240,160,32,0.2)',color:'#F0A020',fontWeight:600}}>Cached</span>}
              </div>
              <div style={{display:'inline-block',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'6px 14px',fontSize:13,color:'#8888A0',marginTop:4}}>
                💬 {report.instantVerdict}
              </div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#F0F0F5',padding:'8px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13}} onClick={()=>window.print()}>⬇ PDF</button>
              <button style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#F0F0F5",padding:"8px 16px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13}} onClick={exportJSON}>{T.export}</button>
              <button style={{background:"rgba(34,212,106,0.1)",border:"1px solid rgba(34,212,106,0.2)",color:"#22D46A",padding:"8px 16px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13}} onClick={()=>{if(report?.id){const link=`${window.location.origin}/report/${report.id}`;navigator.clipboard?.writeText(link);alert(lang==="fa"?"لینک کپی شد — با دیگران به اشتراک بگذار":"Link copied — share it!");}else{alert(lang==="fa"?"ابتدا آنالیز را اجرا کن":"Run analysis first");}}}>{lang==="fa"?"🔗 اشتراک":"🔗 Share"}</button>
              <button style={{background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)',color:'#fff',border:'none',padding:'8px 18px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600}} onClick={()=>{setReport(null);setUrl('');window.scrollTo({top:0,behavior:'smooth'})}}>{T.newAnalysis}</button>
            </div>
          </div>

          {/* ── TABS ── */}
          <div style={{display:'flex',gap:4,marginBottom:28,overflowX:'auto',paddingBottom:4}}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:activeTab===tab.id?600:400,cursor:'pointer',fontFamily:'inherit',border:'none',whiteSpace:'nowrap',background:activeTab===tab.id?'rgba(91,127,255,0.15)':'rgba(255,255,255,0.04)',color:activeTab===tab.id?'#5B7FFF':'#8888A0'}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══ TAB: SUMMARY ══ */}
          {activeTab==='summary' && (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'grid',gridTemplateColumns:report.screenshot?'auto 1fr':'1fr',gap:16,alignItems:'start'}}>
                <GC style={{padding:28,display:'flex',flexDirection:'column',alignItems:'center',gap:20,minWidth:200}}>
                  <ScoreRing score={report.finalScore} size={140} label={T.overallScore}/>
                  <div style={{width:'100%',display:'flex',flexDirection:'column',gap:8}}>
                    {Object.entries(report.scores).map(([k,v])=>(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:100,fontSize:11,color:'#8888A0',textAlign:dir==='rtl'?'right':'left',flexShrink:0}}>{SECTION_NAMES[k]||k}</span>
                        <div style={{flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:v+'%',background:sc(v),borderRadius:2,transition:'width 1.3s ease'}}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:sc(v),width:24,textAlign:'left'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </GC>
                {report.screenshot && (
                  <GC style={{overflow:'hidden',padding:16,position:'relative'}}>
                    <div style={STL(dir)}>📸 Screenshot</div>
                    <div style={{position:'relative'}}>
                      <img src={report.screenshot} alt="screenshot" style={{width:'100%',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',display:'block'}}/>
                      {/* Element issue markers (heatmap-style) */}
                      {report.elementIssues?.slice(0,8).map((iss,i)=>(
                        <div key={i} title={iss.msg} style={{position:'absolute',left:iss.x+'%',top:iss.y+'%',width:16,height:16,borderRadius:'50%',background:'rgba(224,69,69,0.7)',border:'2px solid #fff',cursor:'pointer',transform:'translate(-50%,-50%)',boxShadow:'0 0 8px rgba(224,69,69,0.8)'}}/>
                      ))}
                    </div>
                    {report.elementIssues?.length>0 && <p style={{fontSize:11,color:'#44445A',marginTop:8}}>🔴 {report.elementIssues.length} {lang==='fa'?'مشکل element شناسایی شد':'element issues found'}</p>}
                  </GC>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <GC style={{padding:20}}>
                  <div style={{fontSize:11,color:'#44445A',marginBottom:8}}>💪 {T.strongest}</div>
                  <div style={{fontSize:20,fontWeight:800,color:'#22D46A'}}>{SECTION_NAMES[report.strongest?.key]}</div>
                  <div style={{fontSize:13,color:'#8888A0',marginTop:4}}>{report.strongest?.score}/100</div>
                </GC>
                <GC style={{padding:20}}>
                  <div style={{fontSize:11,color:'#44445A',marginBottom:8}}>⚠ {T.weakest}</div>
                  <div style={{fontSize:20,fontWeight:800,color:'#E04545'}}>{SECTION_NAMES[report.weakest?.key]}</div>
                  <div style={{fontSize:13,color:'#8888A0',marginTop:4}}>{report.weakest?.score}/100</div>
                </GC>
              </div>

              {report.webVitals && (
                <div>
                  <div style={STL(dir)}>⚡ Core Web Vitals + {T.benchmark}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
                    {[
                      {l:'FCP',v:report.webVitals.fcp,u:'ms',bench:report.benchmarks?.fcp},
                      {l:'LCP',v:report.webVitals.lcp,u:'ms',bench:report.benchmarks?.lcp},
                      {l:'TTFB',v:report.webVitals.ttfb,u:'ms',bench:report.benchmarks?.ttfb},
                      {l:'CLS',v:report.webVitals.cls,u:'',bench:null},
                      {l:'Load',v:report.loadTime,u:'ms',bench:null},
                    ].filter(x=>x.v!=null).map((m,i)=>(
                      <GC key={i} style={{padding:16,textAlign:'center'}}>
                        <div style={{fontSize:22,fontWeight:800,color:m.bench?.color||'#8888A0'}}>{m.v}{m.u}</div>
                        <div style={{fontSize:11,color:'#44445A',marginTop:4}}>{m.l}</div>
                        {m.bench && <div style={{fontSize:9,fontWeight:600,color:m.bench.color,marginTop:4}}>{m.bench.label}</div>}
                      </GC>
                    ))}
                  </div>
                </div>
              )}

              {report.perfBreakdown?.length>0 && (
                <div>
                  <div style={STL(dir)}>🔬 {lang==='fa'?'تحلیل ریشه‌ای کندی (Root Cause)':'Root Cause Analysis'}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {report.perfBreakdown.map((b,i)=>(
                      <GC key={i} style={{padding:'14px 18px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700}}>{b.factor}</span>
                          <span style={{fontSize:18,fontWeight:800,color:b.impact>20?'#E04545':b.impact>10?'#F0A020':'#22D46A'}}>{b.impact}%</span>
                        </div>
                        <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',marginBottom:8}}>
                          <div style={{height:'100%',width:b.impact+'%',background:b.impact>20?'#E04545':b.impact>10?'#F0A020':'#22D46A',borderRadius:2}}/>
                        </div>
                        <p style={{fontSize:12,color:'#8888A0'}}>{b.detail} — {b.evidence}</p>
                        <p style={{fontSize:11,color:'#5B7FFF',marginTop:4}}>💡 {b.fix}</p>
                      </GC>
                    ))}
                  </div>
                </div>
              )}

              <GC style={{padding:20,background:'rgba(91,127,255,0.06)',border:'1px solid rgba(91,127,255,0.15)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>🎯 {lang==='fa'?'قدم بعدی':'Next Step'}</div>
                    <div style={{fontSize:13,color:'#8888A0'}}>{lang==='fa'?`${report.allEvidence.filter(e=>e.severity==='critical').length} مشکل بحرانی برای رفع فوری`:`${report.allEvidence.filter(e=>e.severity==='critical').length} critical issues need immediate fix`}</div>
                  </div>
                  <button onClick={()=>setActiveTab('issues')} style={{background:'linear-gradient(135deg,#5B7FFF,#8B5FFF)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600}}>{T.issues} {dir==='rtl'?'←':'→'}</button>
                </div>
              </GC>
            </div>
          )}

          {/* ══ TAB: SEO ══ */}
          {activeTab==='seo' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:16,alignItems:'center'}}>
                <ScoreRing score={report.scores.seo} size={100} label="SEO"/>
                <GC style={{padding:20}}>
                  <p style={{fontSize:13,color:'#8888A0',lineHeight:1.7}}>
                    {lang==='fa'
                      ? `${report.meta.h1Count===1?'✓ ساختار H1 صحیح':report.meta.h1Count===0?'✗ H1 ندارد':`✗ ${report.meta.h1Count} عدد H1`} — ${report.meta.imgNoAlt} از ${report.meta.imgCount} تصویر (${Math.round((1-report.meta.altRatio)*100)}٪) بدون alt — متا دسکریپشن ${report.meta.metaDesc?`موجود (${report.meta.metaDesc.length} کاراکتر)`:'غایب'}`
                      : `${report.meta.h1Count===1?'✓ H1 structure correct':report.meta.h1Count===0?'✗ No H1':`✗ ${report.meta.h1Count} H1 tags`} — ${report.meta.imgNoAlt} of ${report.meta.imgCount} images (${Math.round((1-report.meta.altRatio)*100)}%) missing alt — Meta description ${report.meta.metaDesc?`present (${report.meta.metaDesc.length} chars)`:'missing'}`}
                  </p>
                </GC>
              </div>
              <div>
                <div style={STL(dir)}>{T.evidence}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {report.seoEvidence?.map((e,i)=>(
                    <GC key={i} style={{display:'flex',gap:12,padding:'12px 16px',alignItems:'flex-start'}}>
                      <SeverityBadge severity={e.severity} lang={lang}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:'#F0F0F5',marginBottom:4}}>{e.msg}</div>
                        <div style={{fontSize:11,color:'#5B7FFF'}}>💡 {e.fix}</div>
                      </div>
                    </GC>
                  ))}
                  {(!report.seoEvidence||report.seoEvidence.length===0) && (
                    <GC style={{padding:20,textAlign:'center'}}><p style={{color:'#22D46A',fontSize:13}}>✓ {lang==='fa'?'مشکل مهمی یافت نشد':'No major issues found'}</p></GC>
                  )}
                </div>
              </div>
              <div>
                <div style={STL(dir)}>{lang==='fa'?'بررسی کامل':'Full Checklist'}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {l:lang==='fa'?'عنوان صفحه':'Page Title',v:!!report.meta.title,info:`${report.meta.title?.length||0} ${lang==='fa'?'کاراکتر':'chars'}`},
                    {l:lang==='fa'?'متا دسکریپشن':'Meta Description',v:!!report.meta.metaDesc,info:`${report.meta.metaDesc?.length||0} ${lang==='fa'?'کاراکتر':'chars'}`},
                    {l:'H1',v:report.meta.h1Count===1,info:`${report.meta.h1Count} ${lang==='fa'?'عدد':'tags'}`},
                    {l:'OpenGraph',v:report.meta.hasOG,info:''},
                    {l:'Schema.org',v:report.meta.hasSchema,info:''},
                    {l:'Canonical',v:report.meta.hasCanon,info:''},
                    {l:lang==='fa'?'Alt تصاویر':'Image Alt',v:report.meta.altRatio>=0.8,info:`${Math.round(report.meta.altRatio*100)}%`},
                  ].map((c,i)=>(
                    <GC key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px'}}>
                      <span style={{color:c.v?'#22D46A':'#E04545',fontSize:15,minWidth:20}}>{c.v?'✓':'✗'}</span>
                      <span style={{flex:1,fontSize:13,color:'#8888A0'}}>{c.l}</span>
                      <span style={{fontSize:12,color:'#44445A',fontFamily:'monospace'}}>{c.info}</span>
                    </GC>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: PERFORMANCE ══ */}
          {activeTab==='performance' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:16,alignItems:'center'}}>
                <ScoreRing score={report.scores.performance} size={100} label={lang==='fa'?'عملکرد':'Perf'}/>
                <GC style={{padding:20}}>
                  <p style={{fontSize:13,color:'#8888A0',lineHeight:1.7}}>
                    {report.meta.jsFiles} {lang==='fa'?'فایل JS':'JS files'}, {report.meta.cssFiles} CSS — {report.meta.hasLazy?(lang==='fa'?'Lazy load فعال':'Lazy load active'):(lang==='fa'?'بدون lazy load':'No lazy load')} — {report.meta.hasGzip?'Gzip ✓':'Gzip ✗'}
                  </p>
                </GC>
              </div>

              {report.perfBreakdown?.length>0 && (
                <div>
                  <div style={STL(dir)}>{lang==='fa'?'تفکیک علت کندی':'Slowness Breakdown'}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {report.perfBreakdown.map((b,i)=>(
                      <GC key={i} style={{padding:'14px 18px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700}}>{b.factor}</span>
                          <span style={{fontSize:16,fontWeight:800,color:b.impact>20?'#E04545':b.impact>10?'#F0A020':'#22D46A'}}>{b.impact}%</span>
                        </div>
                        <p style={{fontSize:12,color:'#8888A0',marginBottom:4}}>{b.detail}</p>
                        <p style={{fontSize:11,color:'#5B7FFF'}}>💡 {b.fix}</p>
                      </GC>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>
                {[
                  {icon:'⚙️',l:'JS',v:report.meta.jsFiles},
                  {icon:'🎨',l:'CSS',v:report.meta.cssFiles},
                  {icon:'📦',l:lang==='fa'?'کل':'Total',v:report.meta.totalReqs},
                  {icon:'📄',l:'HTML',v:report.meta.htmlKB+'KB'},
                  {icon:'🖼',l:'Lazy',v:report.meta.hasLazy?'✓':'✗'},
                  {icon:'🗜',l:'Gzip',v:report.meta.hasGzip?'✓':'✗'},
                ].map((r,i)=>(
                  <GC key={i} style={{padding:16,textAlign:'center'}}>
                    <div style={{fontSize:20,marginBottom:6}}>{r.icon}</div>
                    <div style={{fontSize:17,fontWeight:800}}>{r.v}</div>
                    <div style={{fontSize:10,color:'#44445A',marginTop:4}}>{r.l}</div>
                  </GC>
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: SECURITY ══ */}
          {activeTab==='security' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:16,alignItems:'center'}}>
                <ScoreRing score={report.scores.security} size={100} label={lang==='fa'?'امنیت':'Security'}/>
                <GC style={{padding:20}}>
                  <p style={{fontSize:13,color:'#8888A0',lineHeight:1.7}}>
                    {report.meta.isHttps?'✓ HTTPS':'✗ HTTP'} — CSP:{report.meta.csp?'✓':'✗'} — HSTS:{report.meta.hsts?'✓':'✗'}
                    {report.meta.hasEnvVars && <span style={{color:'#E04545',fontWeight:700}}> — 🚨 ENV LEAK DETECTED!</span>}
                  </p>
                </GC>
              </div>
              <div>
                <div style={STL(dir)}>{T.evidence}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {report.secEvidence?.map((e,i)=>(
                    <GC key={i} style={{display:'flex',gap:12,padding:'12px 16px',alignItems:'flex-start'}}>
                      <SeverityBadge severity={e.severity} lang={lang}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:'#F0F0F5',marginBottom:2}}>{e.msg}</div>
                        <div style={{fontSize:11,color:'#8888A0',marginBottom:4}}>{e.detail}</div>
                        <div style={{fontSize:11,color:'#5B7FFF'}}>💡 {e.fix}</div>
                      </div>
                    </GC>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  {l:'HTTPS',v:report.meta.isHttps},
                  {l:'CSP',v:report.meta.csp},
                  {l:'X-Frame-Options',v:report.meta.xFrame},
                  {l:'HSTS',v:report.meta.hsts},
                  {l:'X-Content-Type',v:report.meta.xContent},
                  {l:lang==='fa'?'Source Map نشت':'Source Map Leak',v:!report.meta.hasSourceMaps},
                  {l:lang==='fa'?'Console.log نشت':'Console.log Leak',v:!report.meta.hasConsoleLog},
                ].map((c,i)=>(
                  <GC key={i} style={{display:'flex',gap:12,padding:'12px 16px',alignItems:'center'}}>
                    <span style={{color:c.v?'#22D46A':'#E04545',fontSize:16,minWidth:20}}>{c.v?'✓':'✗'}</span>
                    <span style={{flex:1,fontSize:13,color:'#8888A0'}}>{c.l}</span>
                  </GC>
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: STACK ══ */}
          {activeTab==='stack' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <GC style={{padding:20}}>
                <div style={{fontSize:11,color:'#44445A',marginBottom:8}}>{lang==='fa'?'استراتژی رندر':'Render Strategy'}</div>
                <div style={{fontSize:18,fontWeight:700,color:'#5B7FFF'}}>{report.stack?.renderStrategy}</div>
                <div style={{fontSize:12,color:'#8888A0',marginTop:4}}>{report.stack?.renderDetail}</div>
              </GC>
              {report.stack?.techDebt?.length>0 && (
                <div>
                  <div style={STL(dir)}>⚠ {lang==='fa'?'بدهی فنی شناسایی‌شده':'Detected Tech Debt'}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {report.stack.techDebt.map((td,i)=>(
                      <GC key={i} style={{display:'flex',gap:12,padding:'12px 16px',alignItems:'center'}}>
                        <SeverityBadge severity={td.severity} lang={lang}/>
                        <span style={{fontSize:13,color:'#8888A0'}}>{td.msg}</span>
                      </GC>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={STL(dir)}>{lang==='fa'?'فناوری‌های شناسایی‌شده':'Detected Technologies'} ({report.stack?.detected?.length||0})</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
                  {(report.stack?.detected||[]).map((t,i)=>(
                    <GC key={i} style={{padding:16,display:'flex',gap:12,alignItems:'center'}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:t.color||'#5B7FFF',flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{t.name}</div>
                        <div style={{fontSize:11,color:'#44445A',marginTop:2}}>{t.cat} · {t.confidence}% ({t.signals}/{t.totalSignals} {lang==='fa'?'سیگنال':'signals'})</div>
                      </div>
                      <div style={{width:40,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden',flexShrink:0}}>
                        <div style={{height:'100%',width:t.confidence+'%',background:t.color||'#5B7FFF',borderRadius:2}}/>
                      </div>
                    </GC>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: ISSUES (Priority Board) ══ */}
          {activeTab==='issues' && (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10}}>
                {['critical','high','medium','low'].map(sev=>{
                  const count = report.allEvidence.filter(e=>e.severity===sev).length;
                  const colors = {critical:'#E04545',high:'#F0A020',medium:'#5B7FFF',low:'#8888A0'};
                  return (
                    <GC key={sev} style={{padding:16,textAlign:'center'}}>
                      <div style={{fontSize:28,fontWeight:800,color:colors[sev]}}>{count}</div>
                      <div style={{fontSize:11,color:'#44445A',marginTop:4}}><SeverityBadge severity={sev} lang={lang}/></div>
                    </GC>
                  );
                })}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {report.allEvidence.map((e,i)=>(
                  <GC key={i} style={{padding:'14px 18px'}}>
                    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
                      <SeverityBadge severity={e.severity} lang={lang}/>
                      <span style={{fontSize:11,color:'#5B7FFF',background:'rgba(91,127,255,0.1)',padding:'2px 8px',borderRadius:10}}>{e.section}</span>
                    </div>
                    <div style={{fontSize:13,color:'#F0F0F5',marginBottom:4}}>{e.msg}</div>
                    {e.detail && <div style={{fontSize:11,color:'#8888A0',marginBottom:4}}>{e.detail}</div>}
                    <div style={{fontSize:11,color:'#22D46A'}}>💡 {e.fix}</div>
                  </GC>
                ))}
              </div>
            </div>
          )}

          {/* ══ TAB: PAGES (Multi-page) ══ */}
          {activeTab==='pages' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <GC style={{padding:20}}>
                <div style={{fontSize:11,color:'#44445A',marginBottom:8}}>{lang==='fa'?'صفحات یافت‌شده':'Pages Discovered'}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[
                    {l:lang==='fa'?'Pricing':'Pricing',v:report.crawlInfo?.hasPricingPage},
                    {l:'About',v:report.crawlInfo?.hasAboutPage},
                    {l:'Contact',v:report.crawlInfo?.hasContactPage},
                  ].map((c,i)=>(
                    <span key={i} style={{fontSize:12,padding:'5px 12px',borderRadius:20,background:c.v?'rgba(34,212,106,0.1)':'rgba(224,69,69,0.1)',color:c.v?'#22D46A':'#E04545',border:`1px solid ${c.v?'rgba(34,212,106,0.2)':'rgba(224,69,69,0.2)'}`}}>{c.v?'✓':'✗'} {c.l}</span>
                  ))}
                </div>
              </GC>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {(report.pages||[]).map((p,i)=>(
                  <GC key={i} style={{padding:'16px 20px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:8}}>
                      <div>
                        <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(91,127,255,0.1)',color:'#5B7FFF',marginRight:8}}>{p.type}</span>
                        <span style={{fontSize:13,fontWeight:600}}>{p.title||p.url}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {p.issueCount>0 && <span style={{fontSize:11,color:'#E04545'}}>{p.issueCount} {lang==='fa'?'مشکل':'issues'}</span>}
                        <span style={{fontSize:20,fontWeight:800,color:sc(p.score)}}>{p.score}</span>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'#44445A',fontFamily:'monospace'}}>{p.url}</div>
                  </GC>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ PAYWALL ════ */}
      {showPW && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPW(false)}>
          <GC style={{maxWidth:400,width:'90%',textAlign:'center',padding:44,border:'1px solid rgba(255,255,255,0.12)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:44,marginBottom:14}}>🔒</div>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:10}}>{T.freeLimit}</h3>
            <p style={{color:'#8888A0',marginBottom:24,lineHeight:1.7,fontSize:14}}>{T.freeLimitMsg}</p>
            <button style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#F0F0F5',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13}} onClick={()=>setShowPW(false)}>{T.seeLater}</button>
          </GC>
        </div>
      )}

      <footer style={{borderTop:'1px solid rgba(255,255,255,0.05)',padding:'28px 2rem',textAlign:'center',color:'#44445A',fontSize:13,position:'relative',zIndex:1}}>
        Glasscope v4.0 — {lang==='fa'?'بدون نیاز به API خارجی':'No external API required'}
      </footer>
    </div>
  );
}
