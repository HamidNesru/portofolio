import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search, Upload, Download, Sparkles, RefreshCw, Trash2, Eye, LibraryBig } from "lucide-react";
import { supabase } from "./supabase";

type Profile = { id: string; email: string; full_name: string; role: string; is_active: boolean };
type Resource = { id: string; title: string; description: string | null; category: string; resource_type: string; grade: number | null; file_path: string; file_name: string; mime_type: string; is_published: boolean; created_at: string };
type Submission = { id: string; teacher_id: string; grade: number; subject_id: string; title: string; instructions: string | null; file_path: string; file_name: string; mime_type: string; status: string; submitted_at: string };
type Standard = { id: string; title: string; grade: number; subject_id: string; standard_text: string; marking_guidelines: string | null; is_active: boolean };
type Review = { id: string; submission_id: string; model_name: string; overall_score: number | null; decision: string; report: any; admin_decision: string | null; admin_notes: string | null; created_at: string };
type Subject = { id: string; name: string; grade: number; code: string | null };
type Props = { profile: Profile | null; onBack: () => void; onSignOut?: () => void };
const BUCKET = "pya-academic-files";
const CATEGORIES = ["Academics", "General Knowledge", "Science", "Business Knowledge", "Inspiration", "Psychology"];
const TYPES = ["book", "reference", "sample_questions", "past_paper", "lesson_note", "other"];
const inputStyle: React.CSSProperties = { width: "100%", background: "#0b0d0c", color: "#f3eee0", border: "1px solid #34352f", borderRadius: 7, padding: "12px 13px", outline: "none", fontSize: 13 };
const labelStyle: React.CSSProperties = { display: "block", color: "#c4bda9", fontSize: 10, fontWeight: 800, letterSpacing: 1, marginBottom: 7 };
const panelStyle: React.CSSProperties = { background: "linear-gradient(145deg,#151714,#101210)", border: "1px solid rgba(217,180,91,.2)", borderRadius: 12, padding: 20 };
const goldButton: React.CSSProperties = { background: "linear-gradient(110deg,#f2d98d,#c49a43 55%,#936b24)", color: "#100e09", border: "1px solid rgba(255,231,166,.55)", borderRadius: 8, padding: "12px 17px", fontWeight: 800, cursor: "pointer" };
const outlineButton: React.CSSProperties = { border: "1px solid rgba(230,199,121,.5)", color: "#e7cc83", background: "rgba(255,255,255,.025)", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const titleStyle: React.CSSProperties = { fontFamily: "'Playfair Display',Georgia,serif", color: "#ead18c", fontSize: 22, margin: "0 0 15px" };

export default function PyaAcademicHub({ profile, onBack, onSignOut }: Props) {
  const isAdmin = profile?.role === "admin";
  const isTeacher = profile?.role === "teacher";
  const [entered, setEntered] = useState(Boolean(profile));
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("9");
  const [admission, setAdmission] = useState("");
  const [studentAccess, setStudentAccess] = useState(false);
  const [tab, setTab] = useState("All");
  const [libraryGrade, setLibraryGrade] = useState("all");
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<{subject_id:string; section_id:string}[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", category: "Academics", resource_type: "book", grade: "", subject_id: "" });
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [examForm, setExamForm] = useState({ title: "", grade: "9", subject_id: "", instructions: "" });
  const [examFile, setExamFile] = useState<File | null>(null);
  const [standardForm, setStandardForm] = useState({ title: "", grade: "9", subject_id: "", standard_text: "", marking_guidelines: "" });
  const [adminNotes, setAdminNotes] = useState("");

  const sayError = (s: string) => { setError(s); setMessage(""); };
  const sayMessage = (s: string) => { setMessage(s); setError(""); };
  const loadLibrary = useCallback(async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase.from("pya_library_resources").select("id,title,description,category,resource_type,grade,file_path,file_name,mime_type,is_published,created_at").order("created_at", { ascending: false });
    if (e) throw e;
    setResources((data || []) as Resource[]);
  }, []);

  const loadStaffData = useCallback(async () => {
    if (!supabase || !profile) return;
    setLoading(true);
    try {
      const [subjectRes, assignmentRes] = await Promise.all([
        supabase.from("school_subjects").select("id,name,grade,code").order("grade").order("name"),
        isTeacher ? supabase.from("school_teacher_assignments").select("subject_id,section_id").eq("teacher_id", profile.id).eq("is_active", true) : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (subjectRes.error) throw subjectRes.error;
      if (assignmentRes.error) throw assignmentRes.error;
      setSubjects((subjectRes.data || []) as Subject[]);
      setAssignments(assignmentRes.data || []);
      if (isTeacher && assignmentRes.data?.length) { const firstSubject = (subjectRes.data || []).find((x: Subject) => x.id === assignmentRes.data[0].subject_id); if (firstSubject) setExamForm(prev => ({ ...prev, grade: String(firstSubject.grade) })); }
      await loadLibrary();
      if (isAdmin) {
        const [examRes, standardRes, reviewRes] = await Promise.all([
          supabase.from("pya_exam_submissions").select("id,teacher_id,grade,subject_id,title,instructions,file_path,file_name,mime_type,status,submitted_at").order("submitted_at", { ascending: false }),
          supabase.from("pya_exam_standards").select("id,title,grade,subject_id,standard_text,marking_guidelines,is_active").order("grade"),
          supabase.from("pya_exam_reviews").select("id,submission_id,model_name,overall_score,decision,report,admin_decision,admin_notes,created_at"),
        ]);
        if (examRes.error) throw examRes.error;
        if (standardRes.error) throw standardRes.error;
        if (reviewRes.error) throw reviewRes.error;
        setSubmissions((examRes.data || []) as Submission[]);
        const teacherIds = Array.from(new Set<string>((examRes.data || []).map((x: any) => x.teacher_id)));
        if (teacherIds.length) { const teachersRes = await supabase.from("school_profiles").select("id,full_name,email").in("id", teacherIds); if (teachersRes.error) throw teachersRes.error; setTeacherNames(Object.fromEntries((teachersRes.data || []).map((t: any) => [t.id, t.full_name || t.email || "Teacher"]))); }
        setStandards((standardRes.data || []) as Standard[]);
        setReviews(Object.fromEntries((reviewRes.data || []).map((r: any) => [r.submission_id, r])));
      } else if (isTeacher) {
        const { data, error: e } = await supabase.from("pya_exam_submissions").select("id,teacher_id,grade,subject_id,title,instructions,file_path,file_name,mime_type,status,submitted_at").eq("teacher_id", profile.id).order("submitted_at", { ascending: false });
        if (e) throw e;
        setSubmissions((data || []) as Submission[]);
      }
    } catch (e) { sayError(e instanceof Error ? e.message : "Could not load academic resources."); }
    finally { setLoading(false); }
  }, [profile, isAdmin, isTeacher, loadLibrary]);

  useEffect(() => { if (profile) void loadStaffData(); }, [profile, loadStaffData]);

  const filteredResources = useMemo(() => resources.filter(r => {
    const categoryMatch = tab === "All" || r.category === tab;
    const gradeMatch = libraryGrade === "all" || !r.grade || Number(libraryGrade) === r.grade;
    const text = `${r.title} ${r.file_name} ${r.description || ""} ${r.category}`.toLowerCase();
    return categoryMatch && gradeMatch && text.includes(query.toLowerCase());
  }), [resources, tab, query, libraryGrade]);

  const enterStudentLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return sayError("Supabase is not configured.");
    setBusy(true); setError("");
    try {
      const { data, error: e2 } = await supabase.rpc("pya_validate_library_student", { p_full_name: studentName.trim(), p_grade: Number(studentGrade), p_admission_number: admission.trim() });
      if (e2) throw e2;
      if (data !== true) throw new Error("We could not verify those details. Check your full name, grade and admission number.");
      setStudentAccess(true); setEntered(true); setLibraryGrade(studentGrade); await loadLibrary();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "Student verification failed."); }
    finally { setBusy(false); }
  };

  const uploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile || !resourceFile) return sayError("Select a PDF or Word document to upload.");
    if (!resourceForm.title.trim()) return sayError("Enter the resource title.");
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(resourceFile.type)) return sayError("Only PDF, DOCX or DOC files are accepted.");
    if (resourceFile.size > 20 * 1024 * 1024) return sayError("File size must not exceed 20 MB.");
    setBusy(true);
    try {
      const path = `library/${profile.id}/${crypto.randomUUID()}-${resourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, resourceFile, { contentType: resourceFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("pya_library_resources").insert({ title: resourceForm.title.trim(), description: resourceForm.description.trim() || null, category: resourceForm.category, resource_type: resourceForm.resource_type, grade: resourceForm.grade ? Number(resourceForm.grade) : null, subject_id: resourceForm.subject_id || null, file_path: path, file_name: resourceFile.name, mime_type: resourceFile.type, uploaded_by: profile.id, is_published: isAdmin });
      if (insertError) { await supabase.storage.from(BUCKET).remove([path]); throw insertError; }
      setResourceForm({ title: "", description: "", category: "Academics", resource_type: "book", grade: "", subject_id: "" }); setResourceFile(null);
      sayMessage(isAdmin ? "Resource uploaded and published to the student library." : "Resource uploaded. It will appear after administrator publication.");
      await loadStaffData();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "Library upload failed."); }
    finally { setBusy(false); }
  };

  const submitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile || !examFile) return sayError("Attach the examination paper first.");
    if (!examForm.title.trim() || !examForm.subject_id) return sayError("Enter the exam title and select the assigned subject.");
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(examFile.type)) return sayError("Exam papers must be PDF or modern Word (.docx).");
    if (examFile.size > 20 * 1024 * 1024) return sayError("File size must not exceed 20 MB.");
    setBusy(true);
    try {
      const path = `exams/${profile.id}/${crypto.randomUUID()}-${examFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, examFile, { contentType: examFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("pya_exam_submissions").insert({ teacher_id: profile.id, grade: Number(examForm.grade), subject_id: examForm.subject_id, title: examForm.title.trim(), instructions: examForm.instructions.trim() || null, file_path: path, file_name: examFile.name, mime_type: examFile.type, status: "submitted" });
      if (insertError) { await supabase.storage.from(BUCKET).remove([path]); throw insertError; }
      setExamForm({ title: "", grade: "9", subject_id: "", instructions: "" }); setExamFile(null); sayMessage("Examination paper submitted. The AI report is private to the school administrator."); await loadStaffData();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "Exam submission failed."); }
    finally { setBusy(false); }
  };

  const saveStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile) return;
    if (!standardForm.title.trim() || !standardForm.subject_id || !standardForm.standard_text.trim()) return sayError("Complete the standard title, subject and standard description.");
    setBusy(true);
    try {
      const { error: e2 } = await supabase.from("pya_exam_standards").insert({ title: standardForm.title.trim(), grade: Number(standardForm.grade), subject_id: standardForm.subject_id, standard_text: standardForm.standard_text.trim(), marking_guidelines: standardForm.marking_guidelines.trim() || null, created_by: profile.id, is_active: true });
      if (e2) throw e2;
      setStandardForm({ title: "", grade: "9", subject_id: "", standard_text: "", marking_guidelines: "" }); sayMessage("Exam standard saved."); await loadStaffData();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "Could not save the standard."); }
    finally { setBusy(false); }
  };

  const evaluate = async (submission: Submission) => {
    if (!supabase || !isAdmin) return;
    setBusy(true); setError("");
    try {
      const { data, error: e2 } = await supabase.functions.invoke("evaluate-exam", { body: { submission_id: submission.id } });
      if (e2) throw e2;
      if (data?.error) throw new Error(data.error);
      sayMessage("AI evaluation completed. The report is visible only in this administrator workspace."); await loadStaffData();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "AI evaluation failed. Confirm the Edge Function and Gemini secret are deployed."); }
    finally { setBusy(false); }
  };

  const decide = async (submission: Submission, decision: "approved" | "rejected" | "revision_requested") => {
    if (!supabase || !profile || !isAdmin) return;
    setBusy(true);
    try {
      const { error: reviewError } = await supabase.from("pya_exam_reviews").update({ admin_decision: decision, admin_notes: adminNotes.trim() || null, reviewed_by: profile.id, reviewed_at: new Date().toISOString() }).eq("submission_id", submission.id);
      if (reviewError) throw reviewError;
      const { error: submissionError } = await supabase.from("pya_exam_submissions").update({ status: decision }).eq("id", submission.id);
      if (submissionError) throw submissionError;
      setAdminNotes(""); setSelectedReview(null); sayMessage(`Exam marked ${decision.replaceAll("_", " ")}.`); await loadStaffData();
    } catch (e2) { sayError(e2 instanceof Error ? e2.message : "Could not save administrator decision."); }
    finally { setBusy(false); }
  };

  const openFile = async (path: string) => {
    if (!supabase) return;
    const { data, error: e } = await supabase.storage.from(BUCKET).createSignedUrl(path, 90);
    if (e || !data?.signedUrl) return sayError(e?.message || "Could not create a secure file link.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const publishResource = async (resource: Resource) => {
    if (!supabase || !isAdmin) return;
    const { error: e } = await supabase.from("pya_library_resources").update({ is_published: !resource.is_published }).eq("id", resource.id);
    if (e) return sayError(e.message);
    sayMessage(resource.is_published ? "Resource unpublished." : "Resource published to students."); await loadStaffData();
  };

  const removeResource = async (resource: Resource) => {
    if (!supabase || !isAdmin || !window.confirm(`Delete ${resource.title}?`)) return;
    const { error: e } = await supabase.from("pya_library_resources").delete().eq("id", resource.id);
    if (e) return sayError(e.message);
    await supabase.storage.from(BUCKET).remove([resource.file_path]); sayMessage("Library resource deleted."); await loadStaffData();
  };

  const studentView = !profile;
  if (studentView && !studentAccess) return <div style={{ minHeight: "100vh", background: "#080909", color: "#f6f3eb", fontFamily: "'DM Sans',sans-serif" }}>
    <div style={{ position: "relative", minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(90deg,rgba(4,5,4,.94),rgba(4,5,4,.72)),url('/library.jpg') center/cover no-repeat" }}>
      <button onClick={onBack} style={{ ...outlineButton, position: "absolute", top: 24, left: 24 }}> <ArrowLeft size={15} style={{ verticalAlign: "middle", marginRight: 6 }}/> BACK TO ACADEMY</button>
      <div style={{ width: "min(690px,100%)", textAlign: "center", padding: "clamp(25px,5vw,55px)", background: "rgba(8,9,8,.82)", border: "1px solid rgba(217,180,91,.45)", borderRadius: 18, boxShadow: "0 25px 100px #000" }}>
        <LibraryBig size={48} color="#d9b45b" style={{ marginBottom: 17 }}/><div style={{ color: "#d9b45b", fontSize: 10, letterSpacing: 5, fontWeight: 800 }}>PRESTIGIOUS YOUTH ACADEMY</div>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(30px,5vw,54px)", lineHeight: 1.12, margin: "18px 0 12px", background: "linear-gradient(110deg,#fff1bb,#d8b25a 40%,#f7e4a3 70%,#a77a2b)", backgroundClip: "text", color: "transparent" }}>Welcome to Prestigious Youth Academy Digital Library</h1>
        <p style={{ color: "#c4c0b4", fontSize: 14, lineHeight: 1.8, margin: "0 auto 25px", maxWidth: 510 }}>A world of books, knowledge, discovery and inspiration. Enter with your student details to explore the library.</p>
        <button style={{ ...goldButton, padding: "15px 32px", letterSpacing: 2 }} onClick={() => setEntered(true)}>CLICK ME <span style={{ marginLeft: 8 }}>→</span></button>
        {entered && <form onSubmit={enterStudentLibrary} style={{ textAlign: "left", marginTop: 27, paddingTop: 24, borderTop: "1px solid rgba(217,180,91,.25)" }}>
          <h2 style={{ ...titleStyle, textAlign: "center" }}>Student Library Access</h2>
          <div style={{ display: "grid", gap: 13 }}><div><label style={labelStyle}>STUDENT FULL NAME</label><input style={inputStyle} required value={studentName} onChange={e=>setStudentName(e.target.value)} placeholder="Enter your registered full name"/></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}><div><label style={labelStyle}>GRADE LEVEL</label><select style={inputStyle} value={studentGrade} onChange={e=>setStudentGrade(e.target.value)}>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div><div><label style={labelStyle}>ID / ADMISSION NUMBER</label><input style={inputStyle} required value={admission} onChange={e=>setAdmission(e.target.value)} placeholder="PYA admission number"/></div></div>
            <button style={{ ...goldButton, width: "100%", marginTop: 7 }} disabled={busy}>{busy ? "VERIFYING STUDENT…" : "ENTER DIGITAL LIBRARY"}</button>
          </div>
        </form>}
        {error && <p style={{ color: "#ffb6ae", fontSize: 12, marginTop: 15 }}>{error}</p>}
      </div>
    </div>
  </div>;

  const allowedSubjects = isTeacher ? subjects.filter(s => assignments.some(a => a.subject_id === s.id)) : subjects;
  const pageTitle = isAdmin ? "Administrator Academic Workspace" : isTeacher ? "Teacher Academic Workspace" : "Student Digital Library";
  return <div style={{ minHeight: "100vh", background: "#080909", color: "#f6f3eb", fontFamily: "'DM Sans',sans-serif" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap", padding: "17px clamp(16px,4vw,55px)", borderBottom: "1px solid rgba(217,180,91,.22)", background: "#0d0f0e", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 43, height: 43, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(140deg,#f8e7aa,#b98b35)", color: "#161109" }}><BookOpen size={24}/></div><div><div style={{ color: "#f0d68d", fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>PRESTIGIOUS YOUTH ACADEMY</div><div style={{ color: "#8e8e84", fontSize: 10, marginTop: 4 }}>{pageTitle}</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{profile?.role === "admin" && <button style={outlineButton} onClick={onBack}><ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 5 }}/> DASHBOARD</button>}{profile && <button style={outlineButton} onClick={onSignOut}>SIGN OUT</button>}</div>
    </header>
    <main style={{ maxWidth: 1450, margin: "0 auto", padding: "28px clamp(14px,3vw,35px) 60px" }}>
      {(error || message) && <div style={{ padding: 13, marginBottom: 18, borderRadius: 8, color: error ? "#ffb6ae" : "#a9e6bd", background: error ? "#421b1b66" : "#123b2366", border: `1px solid ${error ? "#8e373766" : "#287b4766"}` }}>{error || message}</div>}
      <section style={{ ...panelStyle, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div><div style={{ color: "#d9b45b", fontSize: 10, letterSpacing: 4, fontWeight: 800 }}>THE KNOWLEDGE COLLECTION</div><h1 style={{ ...titleStyle, fontSize: "clamp(26px,4vw,38px)", margin: "10px 0" }}>Digital Library</h1><p style={{ color: "#9b9b91", fontSize: 12, margin: 0 }}>Books, reference materials, science, business, inspiration and academic resources.</p></div>
        <div style={{ color: "#d9b45b", textAlign: "right", fontSize: 11 }}>{resources.length} published resources</div>
      </section>
      <section style={{ ...panelStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}><h2 style={{ ...titleStyle, margin: 0 }}>Explore the Collection</h2><div style={{ position: "relative", width: "min(370px,100%)" }}><Search size={16} color="#d9b45b" style={{ position: "absolute", left: 12, top: 13 }}/><input style={{ ...inputStyle, paddingLeft: 38 }} placeholder="Search by book or file name…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["All", ...CATEGORIES].map(c=><button key={c} style={tab===c?goldButton:outlineButton} onClick={()=>setTab(c)}>{c}</button>)}</div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}><label style={{ ...labelStyle, margin: 0 }}>FILTER BY GRADE</label><select style={{ ...inputStyle, width: 175 }} value={libraryGrade} onChange={e=>setLibraryGrade(e.target.value)}><option value="all">All grades / General</option>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={String(g)}>Grade {g}</option>)}</select><span style={{ color: "#77786f", fontSize: 10 }}>You can browse your grade, another grade, or general resources.</span></div>
      </section>
      {(isAdmin || isTeacher) && <section style={{ ...panelStyle, marginBottom: 20 }}><h2 style={titleStyle}>Upload Library Resource</h2><form onSubmit={uploadResource} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <div><label style={labelStyle}>RESOURCE TITLE *</label><input style={inputStyle} required value={resourceForm.title} onChange={e=>setResourceForm({...resourceForm,title:e.target.value})}/></div>
        <div><label style={labelStyle}>CATEGORY *</label><select style={inputStyle} value={resourceForm.category} onChange={e=>setResourceForm({...resourceForm,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={labelStyle}>RESOURCE TYPE</label><select style={inputStyle} value={resourceForm.resource_type} onChange={e=>setResourceForm({...resourceForm,resource_type:e.target.value})}>{TYPES.map(t=><option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}</select></div>
        <div><label style={labelStyle}>GRADE (OPTIONAL)</label><select style={inputStyle} value={resourceForm.grade} onChange={e=>setResourceForm({...resourceForm,grade:e.target.value})}><option value="">General / All grades</option>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div>
        <div><label style={labelStyle}>SUBJECT (OPTIONAL)</label><select style={inputStyle} value={resourceForm.subject_id} onChange={e=>setResourceForm({...resourceForm,subject_id:e.target.value})}><option value="">General resource</option>{subjects.map(s=><option key={s.id} value={s.id}>Grade {s.grade} • {s.name}</option>)}</select></div>
        <div><label style={labelStyle}>PDF / WORD FILE *</label><input style={{ ...inputStyle, padding: 9 }} type="file" accept=".pdf,.doc,.docx" onChange={e=>setResourceFile(e.target.files?.[0] || null)} required/></div>
        <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>DESCRIPTION</label><input style={inputStyle} value={resourceForm.description} onChange={e=>setResourceForm({...resourceForm,description:e.target.value})} placeholder="Short description for students"/></div>
        <div style={{ gridColumn: "1/-1" }}><button style={goldButton} disabled={busy}><Upload size={14} style={{ verticalAlign: "middle", marginRight: 7 }}/>{busy ? "UPLOADING…" : isAdmin ? "UPLOAD & PUBLISH RESOURCE" : "UPLOAD RESOURCE FOR ADMIN APPROVAL"}</button></div>
      </form></section>}
      {(isAdmin || isTeacher) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginBottom: 20 }}>
        {isTeacher && <section style={panelStyle}><h2 style={titleStyle}>Teacher Exam Submission</h2><p style={{ color: "#92948d", fontSize: 11, lineHeight: 1.7 }}>Submit a PDF or DOCX examination paper for the grade and subject assigned to your account. AI findings remain administrator-only.</p><form onSubmit={submitExam} style={{ display: "grid", gap: 11 }}>
          <div><label style={labelStyle}>EXAM TITLE *</label><input style={inputStyle} required value={examForm.title} onChange={e=>setExamForm({...examForm,title:e.target.value})} placeholder="Mid-year Mathematics Examination"/></div>
          <div><label style={labelStyle}>GRADE *</label><select style={inputStyle} value={examForm.grade} onChange={e=>setExamForm({...examForm,grade:e.target.value,subject_id:""})}>{Array.from(new Set<number>(allowedSubjects.map(s=>s.grade))).sort((a: number,b: number)=>a-b).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div>
          <div><label style={labelStyle}>ASSIGNED SUBJECT *</label><select style={inputStyle} required value={examForm.subject_id} onChange={e=>setExamForm({...examForm,subject_id:e.target.value})}><option value="">Select subject</option>{allowedSubjects.filter(s=>s.grade===Number(examForm.grade)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label style={labelStyle}>TEACHER NAME</label><input style={{ ...inputStyle, opacity: .8 }} readOnly value={profile?.full_name || "Signed-in teacher"}/></div>
          <div><label style={labelStyle}>ATTACH EXAM (PDF / DOCX) *</label><input style={{ ...inputStyle, padding: 9 }} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={e=>setExamFile(e.target.files?.[0] || null)}/></div>
          <div><label style={labelStyle}>NOTES FOR ADMIN (OPTIONAL)</label><textarea style={{ ...inputStyle, minHeight: 75, resize: "vertical" }} value={examForm.instructions} onChange={e=>setExamForm({...examForm,instructions:e.target.value})}/></div>
          <button style={goldButton} disabled={busy}>{busy?"SUBMITTING…":"SUBMIT EXAM FOR AI REVIEW"}</button>
        </form></section>}
        {isAdmin && <section style={panelStyle}><h2 style={titleStyle}>Set Exam Standards</h2><p style={{ color: "#92948d", fontSize: 11, lineHeight: 1.7 }}>Add the official grade and subject expectations. The AI uses these as its primary reference.</p><form onSubmit={saveStandard} style={{ display: "grid", gap: 10 }}>
          <div><label style={labelStyle}>STANDARD TITLE *</label><input style={inputStyle} required value={standardForm.title} onChange={e=>setStandardForm({...standardForm,title:e.target.value})} placeholder="Grade 8 Mathematics Standard"/></div>
          <div><label style={labelStyle}>GRADE *</label><select style={inputStyle} value={standardForm.grade} onChange={e=>setStandardForm({...standardForm,grade:e.target.value,subject_id:""})}>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div>
          <div><label style={labelStyle}>SUBJECT *</label><select style={inputStyle} required value={standardForm.subject_id} onChange={e=>setStandardForm({...standardForm,subject_id:e.target.value})}><option value="">Select subject</option>{subjects.filter(s=>s.grade===Number(standardForm.grade)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label style={labelStyle}>CURRICULUM / QUALITY STANDARD *</label><textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} required value={standardForm.standard_text} onChange={e=>setStandardForm({...standardForm,standard_text:e.target.value})} placeholder="Topics, learning outcomes, expected competencies…"/></div>
          <div><label style={labelStyle}>MARKING GUIDELINES</label><textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={standardForm.marking_guidelines} onChange={e=>setStandardForm({...standardForm,marking_guidelines:e.target.value})}/></div>
          <button style={goldButton} disabled={busy}>SAVE STANDARD</button>
        </form></section>}
      </div>}
      {isAdmin && <section style={{ ...panelStyle, marginBottom: 20 }}><h2 style={titleStyle}>Administrator Exam Review</h2><p style={{ color: "#92948d", fontSize: 11 }}>Only administrators can see the AI evaluation report and make the official decision.</p>
        {submissions.map(s=>{ const review=reviews[s.id]; const subject=subjects.find(x=>x.id===s.subject_id); return <article key={s.id} style={{ borderTop: "1px solid rgba(217,180,91,.18)", padding: "16px 0", display: "grid", gap: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><strong style={{ color: "#f0d68d" }}>{s.title}</strong><div style={{ color: "#85867d", fontSize: 10, marginTop: 5 }}>Grade {s.grade} • {subject?.name || "Subject"} • {teacherNames[s.teacher_id] || "Teacher"} • {new Date(s.submitted_at).toLocaleString()}</div></div><span style={{ color: "#d9b45b", fontSize: 11 }}>{s.status.replaceAll("_"," ").toUpperCase()}</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={outlineButton} onClick={()=>void openFile(s.file_path)}><Eye size={13} style={{ verticalAlign: "middle", marginRight: 5 }}/>OPEN EXAM FILE</button><button style={goldButton} disabled={busy} onClick={()=>void evaluate(s)}><Sparkles size={13} style={{ verticalAlign: "middle", marginRight: 5 }}/> {review?"RE-RUN AI EVALUATION":"RUN AI EVALUATION"}</button>{review&&<button style={outlineButton} onClick={()=>{setSelectedReview(review);setAdminNotes(review.admin_notes||"")}}>VIEW AI REPORT • {review.overall_score ?? "—"}/100</button>}</div>
          {review?.admin_decision && <div style={{ color: "#c8b777", fontSize: 11 }}>Administrator decision: {review.admin_decision.replaceAll("_"," ")}</div>}
        </article>; })}
        {!submissions.length && <p style={{ color: "#85867d", fontSize: 12 }}>No teacher exam submissions yet.</p>}
      </section>}
      {isTeacher && <section style={{ ...panelStyle, marginBottom: 20 }}><h2 style={titleStyle}>My Exam Submissions</h2>{submissions.map(s=><div key={s.id} style={{ padding: "13px 0", borderTop: "1px solid #292b25", display: "flex", justifyContent: "space-between", gap: 10 }}><div><strong>{s.title}</strong><div style={{ color: "#85867d", fontSize: 10 }}>Grade {s.grade} • {subjects.find(x=>x.id===s.subject_id)?.name || "Subject"}</div></div><span style={{ color: "#d9b45b", fontSize: 11 }}>{s.status.replaceAll("_"," ")}</span></div>)}{!submissions.length&&<p className="muted">You have not submitted an examination paper yet.</p>}</section>}
      <section style={panelStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 15 }}><div><h2 style={{ ...titleStyle, margin: 0 }}>Library Resources</h2>{studentAccess && <div style={{ color: "#85867d", fontSize: 10, marginTop: 6 }}>Welcome, {studentName} • Grade {studentGrade}</div>}</div><button style={outlineButton} onClick={()=>void loadStaffData()}><RefreshCw size={13} style={{ verticalAlign: "middle", marginRight: 5 }}/>REFRESH</button></div>
        {filteredResources.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 13 }}>{filteredResources.map(r=><article key={r.id} style={{ background: "#0e100e", border: "1px solid rgba(217,180,91,.2)", borderRadius: 10, padding: 16 }}><div style={{ color: "#d9b45b", fontSize: 9, letterSpacing: 1, fontWeight: 800 }}>{r.category.toUpperCase()} • {r.grade ? `GRADE ${r.grade}` : "GENERAL"}</div><h3 style={{ color: "#f1dfad", fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, margin: "10px 0 6px" }}>{r.title}</h3><p style={{ color: "#8f9087", fontSize: 11, lineHeight: 1.6, minHeight: 35 }}>{r.description || r.file_name}</p><div style={{ color: "#6f7169", fontSize: 9, marginBottom: 12 }}>{r.resource_type.replaceAll("_"," ")} • {r.file_name}</div><button style={{ ...goldButton, width: "100%" }} onClick={()=>void openFile(r.file_path)}><Download size={13} style={{ verticalAlign: "middle", marginRight: 6 }}/>OPEN / DOWNLOAD</button>{isAdmin&&<div style={{ display: "flex", gap: 7, marginTop: 8 }}><button style={{ ...outlineButton, flex: 1, padding: 8 }} onClick={()=>void publishResource(r)}>{r.is_published?"UNPUBLISH":"PUBLISH"}</button><button style={{ ...outlineButton, padding: 8, color: "#e58b82" }} onClick={()=>void removeResource(r)}><Trash2 size={13}/></button></div>}</article>)}</div> : <p style={{ color: "#85867d", fontSize: 12 }}>No resources match your search. Try another category or file name.</p>}
      </section>
      {isAdmin && standards.length > 0 && <section style={{ ...panelStyle, marginTop: 20 }}><h2 style={titleStyle}>Saved Examination Standards</h2>{standards.map(s=><div key={s.id} style={{ borderTop: "1px solid #292b25", padding: "10px 0", fontSize: 11 }}><strong>{s.title}</strong><span style={{ color: "#85867d" }}> — Grade {s.grade} • {subjects.find(x=>x.id===s.subject_id)?.name}</span></div>)}</section>}
      {selectedReview && <div onClick={()=>setSelectedReview(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000c", display: "grid", placeItems: "center", padding: 15 }}><div onClick={e=>e.stopPropagation()} style={{ ...panelStyle, width: "min(900px,100%)", maxHeight: "90vh", overflow: "auto", borderColor: "rgba(217,180,91,.6)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><h2 style={titleStyle}>Private AI Examination Report</h2><button style={outlineButton} onClick={()=>setSelectedReview(null)}>CLOSE</button></div><div style={{ color: "#d9b45b", fontSize: 12, marginBottom: 12 }}>Score: {selectedReview.overall_score ?? "—"}/100 • Decision: {selectedReview.decision.replaceAll("_"," ")} • {selectedReview.model_name}</div><pre style={{ whiteSpace: "pre-wrap", color: "#ddd6c5", fontFamily: "inherit", fontSize: 12, lineHeight: 1.75 }}>{JSON.stringify(selectedReview.report, null, 2)}</pre><label style={labelStyle}>ADMINISTRATOR NOTES</label><textarea style={{ ...inputStyle, minHeight: 75 }} value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} placeholder="Optional review notes"/><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button style={goldButton} disabled={busy} onClick={()=>{const s=submissions.find(x=>x.id===selectedReview.submission_id);if(s)void decide(s,"approved")}}>APPROVE EXAM</button><button style={outlineButton} disabled={busy} onClick={()=>{const s=submissions.find(x=>x.id===selectedReview.submission_id);if(s)void decide(s,"revision_requested")}}>REQUEST REVISION</button><button style={{ ...outlineButton, color: "#f19a91", borderColor: "#7b3934" }} disabled={busy} onClick={()=>{const s=submissions.find(x=>x.id===selectedReview.submission_id);if(s)void decide(s,"rejected")}}>REJECT</button></div></div></div>}
      {loading && <div style={{ textAlign: "center", color: "#d9b45b", padding: 20 }}>Loading academic workspace…</div>}
    </main>
  </div>;
}

