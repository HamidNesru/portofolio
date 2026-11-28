import React, { useState } from "react";
import { supabase } from "./supabase";

type Props = { onCreated?: () => void };
type AccountRole = "teacher" | "parent";

export default function StaffAccountManager({ onCreated }: Props) {
  const [role, setRole] = useState<AccountRole>("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{email:string;password:string;role:string}|null>(null);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    if (password.length < 8) return setError("Temporary password must contain at least 8 characters.");
    setBusy(true); setError(""); setMessage(""); setCreated(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your administrator session has expired. Sign in again.");
      const { data, error: invokeError } = await supabase.functions.invoke("create-staff-account", {
        body: { full_name: fullName.trim(), email: email.trim().toLowerCase(), password, role },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (invokeError) {
        const context = (invokeError as any).context;
        let detail = invokeError.message;
        try { if (context?.json) { const body = await context.json(); detail = body.error || body.message || detail; } } catch {}
        throw new Error(detail);
      }
      if (!data?.success) throw new Error(data?.error || "Account creation failed.");
      setCreated({ email: email.trim().toLowerCase(), password, role });
      setMessage(`${role === "teacher" ? "Teacher" : "Parent"} account created successfully.`);
      setFullName(""); setEmail(""); setPassword("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally { setBusy(false); }
  };

  return <section className="panel" style={{marginBottom:16}}>
    <h3 className="panel-title">Create Teacher / Parent Login</h3>
    <p className="muted" style={{fontSize:11,lineHeight:1.7,marginTop:-8}}>The administrator creates each login. The email address is the username. Give the temporary password to the staff member or parent securely.</p>
    {(error || message) && <div className={`notice ${error ? "error" : "success"}`} style={{marginTop:12}}>{error || message}</div>}
    <form className="form-grid" onSubmit={createAccount}>
      <div><label className="small-label">ACCOUNT TYPE *</label><select className="field" value={role} onChange={e=>setRole(e.target.value as AccountRole)}><option value="teacher">Teacher</option><option value="parent">Parent</option></select></div>
      <div><label className="small-label">FULL NAME *</label><input className="field" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full legal name"/></div>
      <div><label className="small-label">USERNAME / EMAIL *</label><input className="field" type="email" required autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@example.com"/></div>
      <div><label className="small-label">TEMPORARY PASSWORD *</label><input className="field" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></div>
      <div className="full"><button className="gold-button" disabled={busy}>{busy ? "CREATING ACCOUNT…" : `CREATE ${role.toUpperCase()} ACCOUNT`}</button></div>
    </form>
    {created && <div className="exam-card" style={{marginTop:16,borderColor:"rgba(217,180,91,.5)"}}>
      <strong style={{color:"#e7ca7b"}}>New login created — share securely</strong>
      <p style={{fontSize:12,margin:"10px 0 4px"}}>Username: <strong>{created.email}</strong></p>
      <p style={{fontSize:12,margin:"4px 0 12px"}}>Temporary password: <strong>{created.password}</strong></p>
      <p className="muted" style={{fontSize:10}}>Ask the account holder to change this password after their first sign-in. This password is shown only in this confirmation.</p>
      <button type="button" className="outline-button" onClick={()=>{void navigator.clipboard?.writeText(`Username: ${created.email}\nTemporary password: ${created.password}`);}}>COPY LOGIN DETAILS</button>
    </div>}
  </section>;
}

