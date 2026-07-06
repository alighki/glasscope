// ── Shared UI primitives ──────────────────────────────────────────
export const sc = n => n>=75?'#22D46A':n>=50?'#F0A020':'#E04545';
export const vt = (v,g,o) => v==null?'#44445A':v<=g?'#22D46A':v<=o?'#F0A020':'#E04545';

export const GC = ({children, style={}, onClick}) => (
  <div onClick={onClick} style={{background:'rgba(255,255,255,0.03)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,...style}}>
    {children}
  </div>
);

export const STL = (dir='rtl') => ({ fontSize:11,fontWeight:600,color:'#44445A',letterSpacing:'0.1em',textTransform:'uppercase',paddingBottom:12,marginBottom:16,borderBottom:'1px solid rgba(255,255,255,0.05)',textAlign:dir==='rtl'?'right':'left' });

export function ScoreRing({ score, size=120, label='Score' }) {
  const r=size/2-10, circ=2*Math.PI*r, offset=circ-(score/100)*circ, color=sc(score);
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{width:size,height:size,transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:'stroke-dashoffset 1.3s ease',filter:`drop-shadow(0 0 6px ${color})`}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:size/3.2,fontWeight:800,color,letterSpacing:'-2px',lineHeight:1}}>{score}</div>
        <div style={{fontSize:size/10,color:'#44445A',marginTop:2}}>{label}</div>
      </div>
    </div>
  );
}

export function SeverityBadge({ severity, lang='fa' }) {
  const map = {
    critical:{bg:'rgba(224,69,69,0.15)',c:'#E04545',fa:'بحرانی',en:'Critical'},
    high:{bg:'rgba(240,160,32,0.15)',c:'#F0A020',fa:'مهم',en:'High'},
    medium:{bg:'rgba(91,127,255,0.15)',c:'#5B7FFF',fa:'متوسط',en:'Medium'},
    low:{bg:'rgba(136,136,160,0.15)',c:'#8888A0',fa:'کم',en:'Low'},
  };
  const m = map[severity]||map.low;
  return <span style={{fontSize:10,padding:'3px 9px',borderRadius:20,fontWeight:700,background:m.bg,color:m.c,flexShrink:0,whiteSpace:'nowrap'}}>{lang==='fa'?m.fa:m.en}</span>;
}

export const SECTION_NAMES_FA = { seo:'سئو',performance:'عملکرد',ux:'تجربه کاربری',accessibility:'دسترسی‌پذیری',mobile:'موبایل',content:'محتوا',conversion:'تبدیل',technical:'فنی',security:'امنیت',trust:'اعتماد',navigation:'ناوبری',innovation:'نوآوری' };
export const SECTION_NAMES_EN = { seo:'SEO',performance:'Performance',ux:'UX',accessibility:'Accessibility',mobile:'Mobile',content:'Content',conversion:'Conversion',technical:'Technical',security:'Security',trust:'Trust',navigation:'Navigation',innovation:'Innovation' };
