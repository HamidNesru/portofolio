// "Always Achieving Excellence" card — shown on the public home page above the Digital Library.
// Image: put boss.jpg in client/public (it is served as /boss.jpg).
const ACHIEVEMENT_CSS = `
.excel-section { padding:64px clamp(18px,5vw,76px) 56px; background:linear-gradient(180deg,#080909,#0d0f0e); }
.excel-card { position:relative; display:grid; grid-template-columns:minmax(260px,420px) 1fr; max-width:1120px; margin:0 auto; overflow:hidden;
  border:1px solid rgba(217,180,91,.48); border-radius:18px; background:linear-gradient(135deg,rgba(217,180,91,.12),rgba(255,255,255,.015));
  box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 45px rgba(217,180,91,.08); }
.excel-photo { position:relative; min-height:360px; }
.excel-photo img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center top; display:block; }
.excel-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent 60%,rgba(8,9,9,.85)); }
.excel-body { padding:clamp(28px,4vw,56px); display:flex; flex-direction:column; justify-content:center; }
.excel-line { width:64px; height:2px; background:linear-gradient(90deg,#d9b45b,#f5df9a); margin:16px 0 20px; }
.excel-title { font-family:'Playfair Display',Georgia,serif; font-size:clamp(28px,4vw,46px); line-height:1.15; margin:12px 0 0; }
.excel-copy { color:#b8b7ad; font-size:14px; line-height:1.9; margin:0; max-width:520px; }
@media(max-width:800px) { .excel-card { grid-template-columns:1fr; } .excel-photo { min-height:300px; } .excel-photo::after { background:linear-gradient(180deg,transparent 60%,rgba(8,9,9,.85)); } }
`;

export default function AchievementCard() {
  return (
    <section className="excel-section" id="achieving-excellence">
      <style>{ACHIEVEMENT_CSS}</style>
      <div className="excel-card">
        <div className="excel-photo"><img src="/boss.jpg" alt="Always achieving excellence" loading="lazy" /></div>
        <div className="excel-body">
          <div className="eyebrow">PRESTIGIOUS YOUTH ACADEMY</div>
          <h2 className="excel-title">Always Achieving <span className="gold-text">Excellence.</span></h2>
          <div className="excel-line" />
          <p className="excel-copy">A tradition of high standards, discipline and leadership that shapes every learner to reach their full potential.</p>
        </div>
      </div>
    </section>
  );
}
