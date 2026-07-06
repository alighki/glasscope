import { useEffect, useRef } from 'react';

export default function Particles() {
  const canvasRef = useRef();
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight, raf;
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const pts = Array.from({length:90}, () => ({ x:Math.random()*W, y:Math.random()*H, z:Math.random()*600+100, vx:(Math.random()-.5)*.22, vy:(Math.random()-.5)*.22, vz:(Math.random()-.5)*.35, h:210+Math.random()*60 }));
    function frame() {
      ctx.clearRect(0,0,W,H);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.z+=p.vz;
        if(p.x<0||p.x>W) p.vx*=-1; if(p.y<0||p.y>H) p.vy*=-1; if(p.z<100||p.z>700) p.vz*=-1;
        const s=500/p.z, px=(p.x-W/2)*s+W/2, py=(p.y-H/2)*s+H/2, r=Math.max(.4,2.3*s), a=Math.min(1,s*.65);
        ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fillStyle=`hsla(${p.h},80%,70%,${a*.65})`; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) {
        const pi=pts[i], si=500/pi.z, pix=(pi.x-W/2)*si+W/2, piy=(pi.y-H/2)*si+H/2;
        for(let j=i+1;j<pts.length;j++) {
          const pj=pts[j], sj=500/pj.z, pjx=(pj.x-W/2)*sj+W/2, pjy=(pj.y-H/2)*sj+H/2;
          const d=Math.hypot(pix-pjx,piy-pjy);
          if(d<105){ctx.beginPath();ctx.moveTo(pix,piy);ctx.lineTo(pjx,pjy);ctx.strokeStyle=`hsla(${(pi.h+pj.h)/2},70%,70%,${(1-d/105)*.18})`;ctx.lineWidth=.4;ctx.stroke();}
        }
      }
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.5}}/>;
}
