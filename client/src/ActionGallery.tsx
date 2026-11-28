import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Fixed order (not random). Files live in client/public.
const PHOTOS = ["/g6.jpg", "/g7.jpg", "/g1.jpg", "/g5.jpg", "/g4.jpg", "/g2.jpg"];

const GALLERY_CSS = `
.ag-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:1120px; margin:34px auto 0; padding:26px 0; }
.ag-card { position:relative; aspect-ratio:4/3; border-radius:14px; overflow:visible; border:1px solid rgba(217,180,91,.35); background:#050606;
  transition:transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .55s ease, border-color .55s ease; will-change:transform; }
.ag-card img { width:100%; height:100%; object-fit:cover; display:block; border-radius:13px; }
.ag-card.on { transform:scale(1.55); z-index:5; border-color:#f5df9a; box-shadow:0 30px 80px rgba(0,0,0,.75),0 0 40px rgba(217,180,91,.35); }
@media(max-width:700px){ .ag-grid { grid-template-columns:repeat(2,1fr); gap:12px; } .ag-card.on { transform:scale(1.3); } }
@media (prefers-reduced-motion: reduce){ .ag-card { transition:none; } }
`;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ActionGallery() {
  const [order, setOrder] = useState(PHOTOS.map((_, i) => i));
  const [active, setActive] = useState(-1);
  const refs = useRef(new Map<number, HTMLDivElement>());
  const before = useRef<Map<number, DOMRect> | null>(null);
  const alive = useRef(true);

  // FLIP: after the order changes, glide every card from its old spot to its new one
  useLayoutEffect(() => {
    const prev = before.current;
    if (!prev) return;
    before.current = null;
    refs.current.forEach((el, id) => {
      const a = prev.get(id);
      if (!a) return;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "translate(0,0)" }], { duration: 750, easing: "cubic-bezier(.45,0,.2,1)" });
    });
  }, [order]);

  useEffect(() => {
    alive.current = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      if (calm) return;
      await wait(1200);
      while (alive.current) {
        // 1) each photo grows for 1 second, then returns to its card — in order
        for (let i = 0; i < PHOTOS.length && alive.current; i++) {
          setActive(i);
          await wait(1600); // 0.55s grow + 1s hold
          setActive(-1);
          await wait(650);
        }
        // 2) the whole set slides sideways in rotation, one full turn
        for (let s = 0; s < PHOTOS.length && alive.current; s++) {
          const snap = new Map<number, DOMRect>();
          refs.current.forEach((el, id) => snap.set(id, el.getBoundingClientRect()));
          before.current = snap;
          setOrder((o) => [...o.slice(1), o[0]]);
          await wait(850);
        }
        await wait(1500);
      }
    })();
    return () => { alive.current = false; };
  }, []);

  return (
    <div className="ag-grid">
      <style>{GALLERY_CSS}</style>
      {order.map((id) => (
        <div key={id} ref={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }} className={`ag-card ${active === id ? "on" : ""}`}>
          <img src={PHOTOS[id]} alt="Prestigious Youth Academy" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
