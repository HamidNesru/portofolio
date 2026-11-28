import { useEffect, useRef, useState } from "react";

// Fixed order (not random). Files live in client/public.
const PHOTOS = ["/g6.jpg", "/g7.jpg", "/g1.jpg", "/g5.jpg", "/g4.jpg", "/g2.jpg"];
const N = PHOTOS.length;
const SECONDS = 4.2; // time each photo stays in the spotlight

const GALLERY_CSS = `
.cf { position:relative; max-width:1180px; margin:30px auto 0; padding:10px 0 0; }
.cf-stage { position:relative; height:clamp(260px,46vw,520px); perspective:1500px; perspective-origin:50% 45%; touch-action:pan-y; }
.cf-glow { position:absolute; left:50%; top:46%; width:60%; height:70%; transform:translate(-50%,-50%); background:radial-gradient(ellipse,rgba(217,180,91,.22),transparent 68%); filter:blur(30px); pointer-events:none; }
.cf-card { position:absolute; top:4%; left:50%; width:clamp(210px,46%,540px); aspect-ratio:4/3; margin-left:calc(clamp(210px,46%,540px) / -2);
  border-radius:16px; border:1px solid rgba(217,180,91,.4); background:#050606; cursor:pointer; overflow:hidden;
  transition:transform 1.15s cubic-bezier(.22,.8,.18,1), opacity .9s ease, filter .9s ease, box-shadow 1.15s ease, border-color .9s ease;
  will-change:transform,opacity; backface-visibility:hidden; }
.cf-card img { width:100%; height:100%; object-fit:cover; display:block; transform:scale(1.02); }
.cf-card.mid { border-color:#f5df9a; box-shadow:0 40px 90px rgba(0,0,0,.75),0 0 55px rgba(217,180,91,.28); }
.cf-card.mid img { animation:cfZoom 9s ease-out forwards; }
.cf-card::after { content:""; position:absolute; inset:0; background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%); transform:translateX(-120%); }
.cf-card.mid::after { animation:cfShine 1.8s .5s ease-out 1 forwards; }
@keyframes cfZoom { from{transform:scale(1.02)} to{transform:scale(1.12)} }
@keyframes cfShine { to{transform:translateX(120%)} }
.cf-ref { position:absolute; left:50%; bottom:-2%; width:46%; height:18%; transform:translateX(-50%); background:radial-gradient(ellipse at 50% 0,rgba(217,180,91,.28),transparent 70%); pointer-events:none; }
.cf-bar { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:22px; }
.cf-count { font-family:'Playfair Display',Georgia,serif; color:#f5df9a; letter-spacing:.14em; font-size:15px; min-width:64px; text-align:center; }
.cf-dots { display:flex; gap:10px; }
.cf-dot { position:relative; width:34px; height:3px; border:0; padding:0; border-radius:3px; background:rgba(217,180,91,.25); cursor:pointer; overflow:hidden; }
.cf-dot.on::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,#d9b45b,#f5df9a); transform-origin:left; animation:cfFill ${SECONDS}s linear forwards; }
@keyframes cfFill { from{transform:scaleX(0)} to{transform:scaleX(1)} }
.cf-arrow { width:38px; height:38px; border-radius:50%; border:1px solid rgba(217,180,91,.5); background:transparent; color:#f5df9a; cursor:pointer; font-size:16px; }
.cf-arrow:hover { background:rgba(217,180,91,.14); }
@media(max-width:700px){ .cf-dot { width:20px; } .cf-stage { perspective:900px; } }
@media (prefers-reduced-motion: reduce){ .cf-card, .cf-card img, .cf-card::after, .cf-dot.on::after { animation:none !important; transition:none !important; } }
`;

export default function ActionGallery() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const go = (d: number) => setIdx((i) => (i + d + N) % N);

  // advance in order, one photo every few seconds; restarts the timer when the user clicks
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(1), SECONDS * 1000);
    return () => clearTimeout(t);
  }, [idx, paused]);

  const style = (i: number): React.CSSProperties => {
    const d = ((i - idx + N + N / 2) % N) - N / 2; // -3 … +2, shortest way round
    const a = Math.abs(d);
    return {
      transform: `translateX(${d * 46}%) translateZ(${-a * 170}px) rotateY(${-Math.sign(d) * Math.min(a, 2) * 42}deg) scale(${d === 0 ? 1.08 : 0.92})`,
      opacity: a > 2 ? 0 : 1 - a * 0.28,
      filter: d === 0 ? "none" : `brightness(${0.55 - (a - 1) * 0.12}) saturate(.85)`,
      zIndex: 10 - Math.round(a * 2),
      pointerEvents: a > 2 ? "none" : "auto",
    };
  };

  return (
    <div className="cf" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current !== null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); } touch.current = null; }}>
      <style>{GALLERY_CSS}</style>
      <div className="cf-stage">
        <div className="cf-glow" />
        {PHOTOS.map((src, i) => (
          <div key={src} className={`cf-card ${i === idx ? "mid" : ""}`} style={style(i)} onClick={() => setIdx(i)}>
            <img src={src} alt="Prestigious Youth Academy" loading={i < 3 ? "eager" : "lazy"} />
          </div>
        ))}
        <div className="cf-ref" />
      </div>
      <div className="cf-bar">
        <button className="cf-arrow" onClick={() => go(-1)} aria-label="Previous">‹</button>
        <div className="cf-count">{String(idx + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</div>
        <div className="cf-dots">{PHOTOS.map((s, i) => <button key={s} className={`cf-dot ${i === idx ? "on" : ""}`} onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`} />)}</div>
        <button className="cf-arrow" onClick={() => go(1)} aria-label="Next">›</button>
      </div>
    </div>
  );
}
