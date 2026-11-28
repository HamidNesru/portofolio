import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Users, BookOpen, Plus, LogOut, RefreshCw, AlertCircle, CheckCircle2, X, LayoutDashboard, Menu, ArrowRight, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { supabase, hasSupabase } from "./supabase";
import PyaAcademicHub from "./PyaAcademicHub";
import StaffAccountManager from "./StaffAccountManager";
import AchievementCard from "./AchievementCard";

type Profile = { id: string; email: string; full_name: string; role: string; is_active: boolean };
type Section = { id: string; grade: number; section_name: string; academic_year_id: string };
type Student = { id: string; admission_number: string; first_name: string; middle_name: string | null; last_name: string; date_of_birth: string | null; gender: string | null; phone: string | null; address: string | null; is_active: boolean; grade: number; section: string; enrollment_id: string | null };
type StudentForm = { first_name: string; middle_name: string; last_name: string; date_of_birth: string; gender: string; phone: string; address: string; grade: number; section: string };
type Page = "overview" | "students" | "staff" | "library" | "results";
type SchoolUser = { id: string; email: string; full_name: string; role: string; is_active: boolean };
type Subject = { id: string; name: string; code: string | null; grade: number };
type Assignment = { id: string; teacher_id: string; section_id: string; subject_id: string; is_active: boolean };
type TeacherAssignment = Assignment & { section: Section; subject: Subject };
type TeacherRosterStudent = Student & { section_id: string };
type TeacherResultRow = { id: string; student_id: string; score: number; max_score: number; teacher_comment: string | null; entered_by: string | null; status: string };
const HERO_IMAGES = ["/prestpro.png", "/prest22.jpg", "/prest23.jpg", "/prest9.jpg", "/prest7.jpg"];
const EMPTY_FORM: StudentForm = { first_name: "", middle_name: "", last_name: "", date_of_birth: "", gender: "", phone: "", address: "", grade: 9, section: "A" };
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');

:root {
  --gold:#d9b45b;
  --gold2:#f5df9a;
  --gold3:#936b24;
  --black:#080909;
  --panel:#111312;
  --panel2:#171917;
  --muted:#92948d;
  --line:rgba(217,180,91,.20);
}
* { box-sizing:border-box; }
body { margin:0; background:var(--black); color:#f6f3eb; font-family:'DM Sans',sans-serif; }
button,input,select,textarea { font:inherit; }
button { cursor:pointer; }
.pya-app { min-height:100vh; background:var(--black); color:#f6f3eb; }
.gold-text {
  background:linear-gradient(110deg,#fff1bb 0%,#d8b25a 35%,#f7e4a3 60%,#a77a2b 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
.gold-button {
  background:linear-gradient(110deg,#f2d98d,#c49a43 55%,#936b24);
  color:#100e09; border:1px solid rgba(255,231,166,.55);
  border-radius:8px; padding:13px 20px; font-weight:800;
  letter-spacing:.04em; transition:.25s; box-shadow:0 7px 25px rgba(196,154,67,.13);
}
.gold-button:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(196,154,67,.3); }
.outline-button {
  border:1px solid rgba(230,199,121,.5); color:#e7cc83;
  background:rgba(255,255,255,.025); border-radius:8px;
  padding:12px 19px; font-weight:700; transition:.2s;
}
.outline-button:hover { background:rgba(217,180,91,.12); }
.eyebrow { color:var(--gold); font-size:10px; letter-spacing:4px; font-weight:800; text-transform:uppercase; }
.serif { font-family:'Playfair Display',Georgia,serif; }
.landing { min-height:100vh; background:#080909; overflow:hidden; }
.landing-nav {
  position:absolute; z-index:20; top:0; left:0; right:0; height:86px;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 clamp(20px,6vw,90px); border-bottom:1px solid rgba(217,180,91,.2);
  background:linear-gradient(180deg,rgba(0,0,0,.8),rgba(0,0,0,.12));
}
.brand { display:flex; align-items:center; gap:13px; }
.brand-mark {
  height:46px; width:46px; display:grid; place-items:center; border-radius:12px;
  color:#161109; background:linear-gradient(140deg,#f8e7aa,#b98b35);
  box-shadow:0 0 25px rgba(217,180,91,.2);
}
.brand-name { font-size:13px; letter-spacing:2px; font-weight:800; color:#f0d68d; }
.brand-sub { font-size:8px; letter-spacing:2.5px; color:#a5a093; margin-top:4px; }
.hero {
  height:min(900px,100vh); min-height:690px; position:relative;
  display:flex; align-items:center; isolation:isolate;
  background:#111 url('/prestpro.png') center/cover no-repeat;
}
.hero-photo {
  position:absolute; inset:0; z-index:-2; background-position:center;
  background-size:cover; transition:opacity 1.1s ease;
}
.hero-shade {
  position:absolute; inset:0; z-index:-1;
  background:linear-gradient(90deg,rgba(3,5,4,.97) 0%,rgba(3,5,4,.86) 38%,rgba(3,5,4,.3) 75%,rgba(3,5,4,.35) 100%),
  linear-gradient(0deg,#080909 0%,transparent 34%,rgba(0,0,0,.2) 100%);
}
.hero-content { width:min(1250px,100%); margin:auto; padding:130px 7vw 90px; }
.hero-kicker { display:flex; align-items:center; gap:12px; color:#e3c36e; font-size:10px; letter-spacing:4px; font-weight:800; }
.hero-kicker:before { content:''; width:38px; height:1px; background:#d9b45b; }
.hero h1 {
  font-family:'Playfair Display',Georgia,serif; font-weight:700;
  font-size:clamp(48px,7vw,91px); line-height:1.02; letter-spacing:-2px;
  max-width:850px; margin:25px 0 22px;
}
.hero h1 span { display:block; }
.hero-desc { max-width:580px; color:#d1d0c9; font-size:16px; line-height:1.9; }
.hero-actions { display:flex; flex-wrap:wrap; gap:13px; margin-top:32px; }
.hero-bottom {
  position:absolute; bottom:35px; left:7vw; right:7vw;
  display:flex; justify-content:space-between; align-items:center;
}
.hero-dots { display:flex; gap:8px; }
.hero-dot { width:25px; height:3px; border:0; border-radius:5px; background:#777; padding:0; }
.hero-dot.active { width:48px; background:#e5c36d; }
.landing-section { padding:100px clamp(22px,7vw,100px); }
.section-heading { font-family:'Playfair Display',Georgia,serif; font-size:clamp(32px,4vw,48px); margin:13px 0; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:38px; }
.feature-card {
  padding:30px; min-height:210px; border:1px solid var(--line);
  background:linear-gradient(145deg,#171916,#0d0f0e);
  border-radius:13px; transition:.3s;
}
.feature-card:hover { transform:translateY(-5px); border-color:rgba(217,180,91,.65); box-shadow:0 15px 35px #0008; }
.feature-icon { color:#dfbd69; margin-bottom:22px; }
.feature-card h3 { font-family:'Playfair Display',Georgia,serif; font-size:21px; margin:0 0 10px; }
.feature-card p { color:#9e9f98; font-size:13px; line-height:1.8; margin:0; }
.activity-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:38px; }
.activity-tile { position:relative; overflow:hidden; border-radius:10px; min-height:190px; background:#1b1b18; }
.activity-tile img { width:100%; height:220px; object-fit:cover; display:block; transition:transform .6s; }
.activity-tile:hover img { transform:scale(1.06); }
.activity-tile:after { content:''; position:absolute; inset:35% 0 0; background:linear-gradient(transparent,#000d); }
.activity-tile span { position:absolute; z-index:1; bottom:15px; left:15px; font-size:12px; font-weight:800; }
.landing-footer { border-top:1px solid var(--line); padding:32px 7vw; color:#77786f; font-size:11px; display:flex; justify-content:space-between; gap:15px; flex-wrap:wrap; }
.login-overlay {
  position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.86);
  backdrop-filter:blur(12px); display:grid; place-items:center; padding:20px;
}
.login-card {
  width:min(440px,100%); background:linear-gradient(145deg,#191a17,#0b0c0b);
  border:1px solid rgba(217,180,91,.5); border-radius:17px;
  padding:34px; box-shadow:0 25px 100px #000;
}
.login-input,.field {
  width:100%; background:#0b0d0c; color:#f3eee0; border:1px solid #34352f;
  border-radius:7px; padding:13px 14px; outline:none; font-size:13px;
}
.login-input:focus,.field:focus { border-color:#c9a44e; box-shadow:0 0 0 3px rgba(217,180,91,.08); }
.role-choice {
  padding:12px 7px; border:1px solid #37372f; border-radius:7px;
  color:#aaa99f; background:#111310; font-size:11px; font-weight:800;
}
.role-choice.selected { color:#17130a; background:linear-gradient(110deg,#efd68c,#b78a36); border-color:#d9b45b; }
.portal { min-height:100vh; display:flex; background:#090b0a; }
.sidebar {
  width:255px; flex-shrink:0; min-height:100vh; position:sticky; top:0; height:100vh;
  background:linear-gradient(180deg,#121411,#090a09); border-right:1px solid var(--line);
  padding:25px 17px; display:flex; flex-direction:column; z-index:30;
}
.side-brand { padding:3px 9px 28px; border-bottom:1px solid var(--line); }
.side-label { color:#77786f; font-size:9px; letter-spacing:2px; font-weight:800; padding:24px 12px 10px; }
.side-link {
  width:100%; display:flex; align-items:center; gap:12px; padding:13px 13px;
  color:#a7a69d; border:1px solid transparent; border-radius:8px;
  background:transparent; text-align:left; font-size:12px; font-weight:700;
  transition:.2s; margin-bottom:5px;
}
.side-link:hover { color:#f1d78f; background:#ffffff08; }
.side-link.active {
  color:#f0d78f; background:linear-gradient(90deg,rgba(217,180,91,.16),rgba(217,180,91,.035));
  border-color:rgba(217,180,91,.22); box-shadow:inset 3px 0 #d9b45b;
}
.side-bottom { margin-top:auto; border-top:1px solid var(--line); padding-top:18px; }
.portal-main { flex:1; min-width:0; }
.topbar {
  height:76px; border-bottom:1px solid var(--line); background:#0d0f0e;
  display:flex; justify-content:space-between; align-items:center; padding:0 30px;
  position:sticky; top:0; z-index:20;
}
.topbar-user { display:flex; align-items:center; gap:12px; }
.avatar {
  width:37px; height:37px; border-radius:50%; display:grid; place-items:center;
  background:linear-gradient(140deg,#efd78e,#936b24); color:#17130a; font-weight:900;
}
.content { max-width:1500px; padding:30px; margin:auto; }
.page-title { font-family:'Playfair Display',Georgia,serif; font-size:29px; margin:0; }
.page-sub { color:#85867d; font-size:12px; margin-top:7px; }
.welcome-banner {
  position:relative; overflow:hidden; border:1px solid rgba(217,180,91,.32);
  background:radial-gradient(ellipse at 85% 50%,rgba(188,146,55,.22),transparent 42%),linear-gradient(110deg,#1a1b16,#10120f);
  border-radius:13px; padding:30px; margin-bottom:24px;
}
.welcome-banner:after { content:'✦'; position:absolute; right:55px; top:5px; font-size:120px; color:#d9b45b12; }
.stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:22px 0; }
.stat-card {
  border:1px solid var(--line); border-radius:10px; padding:19px;
  background:linear-gradient(145deg,#171916,#101210); min-width:0;
}
.stat-top { display:flex; justify-content:space-between; color:#9b9b91; font-size:11px; align-items:center; }
.stat-icon { color:#d9b45b; background:rgba(217,180,91,.1); border-radius:8px; padding:9px; }
.stat-value { font-size:29px; font-weight:800; color:#f0d68d; margin-top:17px; }
.stat-note { font-size:10px; color:#777970; margin-top:4px; }
.panel {
  background:linear-gradient(145deg,#151714,#101210); border:1px solid var(--line);
  border-radius:11px; padding:22px; min-width:0;
}
.panel-title { color:#ead18c; font-family:'Playfair Display',Georgia,serif; font-size:19px; margin:0 0 18px; }
.panel-grid { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; min-width:900px; font-size:11px; }
th { color:#e7ca7b; text-align:left; padding:13px 10px; background:#1b1d18; white-space:nowrap; }
td { padding:12px 10px; border-bottom:1px solid #292b25; color:#d0d0c7; }
tbody tr:hover { background:#ffffff06; }
.table-input { width:55px; background:#090b09; border:1px solid #36372f; border-radius:5px; padding:7px 4px; color:#f4dfa0; text-align:center; }
.library-showcase {
  position:relative; overflow:hidden; margin:0; padding:72px clamp(18px,5vw,76px) 64px;
  background:radial-gradient(ellipse at 50% 0%,rgba(217,180,91,.13),transparent 48%),linear-gradient(180deg,#11130f,#080a09);
  border-top:1px solid rgba(217,180,91,.18); border-bottom:1px solid rgba(217,180,91,.18);
}
.library-showcase-inner { max-width:1320px; margin:0 auto; text-align:center; }
.library-showcase-title { font-family:'Playfair Display',Georgia,serif; font-size:clamp(28px,4vw,48px); line-height:1.15; margin:12px auto 14px; }
.library-showcase-copy { color:#b8b7ad; font-size:14px; line-height:1.9; max-width:760px; margin:0 auto 25px; }
.library-showcase-image-wrap { position:relative; max-width:1120px; margin:28px auto 0; padding:12px; border:1px solid rgba(217,180,91,.48); border-radius:16px; background:linear-gradient(135deg,rgba(217,180,91,.12),rgba(255,255,255,.015)); box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 45px rgba(217,180,91,.08); }
.library-showcase-image { display:block; width:100%; height:auto; max-height:620px; object-fit:contain; object-position:center; border-radius:10px; background:#050606; }
.library-cta { min-width:180px; margin-top:24px; padding:15px 30px; border-radius:999px; letter-spacing:.16em; }
.teacher-hero { position:relative; overflow:hidden; padding:30px; border:1px solid rgba(217,180,91,.35); border-radius:16px; background:radial-gradient(ellipse at 88% 10%,rgba(217,180,91,.18),transparent 40%),linear-gradient(120deg,#191b16,#0d100e); }
.teacher-hero:after { content:'✦'; position:absolute; right:32px; top:4px; font-size:120px; color:rgba(217,180,91,.07); pointer-events:none; }
.stat-pill { display:inline-flex; align-items:center; border:1px solid rgba(217,180,91,.3); background:rgba(217,180,91,.08); color:#e9d18e; border-radius:999px; padding:9px 13px; font-size:10px; font-weight:800; letter-spacing:.04em; }
.result-toolbar { display:grid; grid-template-columns:1.2fr 1fr .65fr; gap:13px; margin-top:20px; }
.result-score-input { width:88px; min-width:70px; padding:9px 8px; text-align:center; color:#f5dfa0; background:#080a09; border:1px solid rgba(217,180,91,.35); border-radius:7px; }
.result-comment-input { width:100%; min-width:150px; padding:9px 10px; color:#f5f0df; background:#080a09; border:1px solid #34372e; border-radius:7px; }
@media(max-width:700px) { .library-showcase { padding:54px 15px 48px; } .library-showcase-image-wrap { padding:6px; border-radius:10px; } .result-toolbar { grid-template-columns:1fr; } .teacher-hero { padding:22px; } }
.notice { padding:13px 16px; border-radius:8px; font-size:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:18px; }
.notice.error { color:#ffb6ae; background:#421b1b66; border:1px solid #8e373766; }
.notice.success { color:#a9e6bd; background:#123b2366; border:1px solid #287b4766; }
.muted { color:#8b8d83; }
.small-label { display:block; color:#a6a69c; font-size:10px; font-weight:800; letter-spacing:1px; margin-bottom:8px; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:13px; }
.form-grid .full { grid-column:1/-1; }
.exam-card,.message-card,.gallery-card {
  background:#151714; border:1px solid var(--line); border-radius:10px; padding:18px; margin-bottom:13px;
}
.gallery-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; }
.gallery-card { padding:0; overflow:hidden; }
.gallery-card img { width:100%; height:190px; object-fit:cover; display:block; background:#222; }
.gallery-caption { padding:15px; }
.mobile-menu { display:none; }
@media(max-width:950px) {
  .sidebar { width:215px; }
  .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .feature-grid { grid-template-columns:1fr 1fr; }
  .activity-strip { grid-template-columns:1fr 1fr; }
  .gallery-grid { grid-template-columns:1fr 1fr; }
}
@media(max-width:700px) {
  .landing-nav { height:72px; padding:0 17px; }
  .brand-name { font-size:10px; letter-spacing:1px; }
  .brand-sub { font-size:7px; letter-spacing:1px; }
  .brand-mark { width:39px; height:39px; }
  .hero { min-height:720px; height:90vh; }
  .hero-content { padding:110px 23px 100px; }
  .hero h1 { font-size:49px; letter-spacing:-1px; }
  .hero-desc { font-size:14px; }
  .hero-bottom { left:23px; right:23px; }
  .landing-section { padding:70px 22px; }
  .feature-grid { grid-template-columns:1fr; }
  .activity-strip { grid-template-columns:1fr 1fr; }
  .activity-tile img { height:155px; }
  .landing-footer { padding:25px 22px; }
  .portal { display:block; }
  .sidebar {
    position:fixed; left:0; top:0; transform:translateX(-100%);
    transition:transform .25s; width:265px; box-shadow:15px 0 50px #0008;
  }
  .sidebar.open { transform:translateX(0); }
  .mobile-menu { display:inline-flex; border:1px solid var(--line); background:#171916; color:#e8ce83; padding:9px; border-radius:7px; }
  .topbar { height:65px; padding:0 15px; }
  .content { padding:19px 14px; }
  .page-title { font-size:24px; }
  .stats-grid { gap:9px; }
  .stat-card { padding:14px; }
  .stat-value { font-size:24px; }
  .panel-grid { grid-template-columns:1fr; }
  .form-grid { grid-template-columns:1fr; }
  .form-grid .full { grid-column:auto; }
  .gallery-grid { grid-template-columns:1fr 1fr; gap:9px; }
  .gallery-card img { height:130px; }
}
@media(max-width:390px) {
  .gallery-grid { grid-template-columns:1fr; }
  .hero h1 { font-size:42px; }
}
`;

function fullName(s: Student) { return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" "); }
function ageFromDob(dob: string | null) { if (!dob) return "—"; const d = new Date(dob); if (Number.isNaN(d.getTime())) return "—"; const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--; return age; }

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showPublicLibrary, setShowPublicLibrary] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [page, setPage] = useState<Page>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState(9);
  const [sectionFilter, setSectionFilter] = useState("A");
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<Student | null>(null);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [parentLinks, setParentLinks] = useState<{id:string;parent_id:string;student_id:string}[]>([]);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", grade: 9 });
  const [assignmentForm, setAssignmentForm] = useState({ teacher_id: "", section_id: "", subject_id: "" });
  const [parentForm, setParentForm] = useState({ parent_id: "", student_id: "" });
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherRoster, setTeacherRoster] = useState<TeacherRosterStudent[]>([]);
  const [selectedTeacherAssignmentId, setSelectedTeacherAssignmentId] = useState("");
  const [assessmentName, setAssessmentName] = useState("Midterm Examination");
  const [marksAssessmentName, setMarksAssessmentName] = useState("Midterm Examination");
  const [assessmentMaxScore, setAssessmentMaxScore] = useState("100");
  const [teacherMarks, setTeacherMarks] = useState<Record<string, { score: string; comment: string; locked?: boolean }>>({});
  const [teacherResultsLoading, setTeacherResultsLoading] = useState(false);
  const [teacherWorkspaceLoading, setTeacherWorkspaceLoading] = useState(false);

  const notify = (s: string) => { setNotice(s); setError(""); };
  const fail = (s: string) => { setError(s); setNotice(""); };

  useEffect(() => { const timer = window.setInterval(() => setHeroIndex(i => (i + 1) % HERO_IMAGES.length), 5500); return () => window.clearInterval(timer); }, []);

  const loadSchoolData = useCallback(async () => {
    if (!supabase || !hasSupabase) { fail("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel environment variables."); return; }
    setLoading(true); setError("");
    try {
      const yearRes = await supabase.from("school_academic_years").select("id,name").eq("is_current", true).maybeSingle();
      if (yearRes.error) throw yearRes.error;
      if (!yearRes.data) throw new Error("No current academic year is configured. Set 2026/2027 as the current year in school_academic_years.");
      setAcademicYearId(yearRes.data.id);
      const [sectionRes, studentRes, usersRes, subjectsRes, assignmentsRes, linksRes] = await Promise.all([
        supabase.from("school_sections").select("id,grade,section_name,academic_year_id").eq("academic_year_id", yearRes.data.id).order("grade").order("section_name"),
        supabase.from("school_students").select("id,admission_number,first_name,middle_name,last_name,date_of_birth,gender,phone,address,is_active").order("last_name").order("first_name"),
        supabase.from("school_profiles").select("id,email,full_name,role,is_active").in("role", ["teacher", "parent"]).order("full_name"),
        supabase.from("school_subjects").select("id,name,code,grade").order("grade").order("name"),
        supabase.from("school_teacher_assignments").select("id,teacher_id,section_id,subject_id,is_active").eq("is_active", true),
        supabase.from("school_parent_student_links").select("id,parent_id,student_id")
      ]);
      for (const result of [sectionRes, studentRes, usersRes, subjectsRes, assignmentsRes, linksRes]) if (result.error) throw result.error;
      setSchoolUsers((usersRes.data || []) as SchoolUser[]);
      setSubjects((subjectsRes.data || []) as Subject[]);
      setAssignments((assignmentsRes.data || []) as Assignment[]);
      setParentLinks((linksRes.data || []) as {id:string;parent_id:string;student_id:string}[]);
      const sectionRows = (sectionRes.data || []) as Section[];
      setSections(sectionRows);
      const studentRows = studentRes.data || [];
      const ids = studentRows.map((s: any) => s.id);
      let enrollmentRows: any[] = [];
      if (ids.length) {
        const enrollRes = await supabase.from("school_enrollments").select("id,student_id,section_id,academic_year_id").eq("academic_year_id", yearRes.data.id).in("student_id", ids);
        if (enrollRes.error) throw enrollRes.error;
        enrollmentRows = enrollRes.data || [];
      }
      const mapped: Student[] = studentRows.map((s: any) => {
        const enrollment = enrollmentRows.find(e => e.student_id === s.id);
        const section = sectionRows.find(sec => sec.id === enrollment?.section_id);
        return { ...s, grade: section?.grade ?? 0, section: section?.section_name ?? "—", enrollment_id: enrollment?.id ?? null };
      });
      setStudents(mapped);
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to load school records."); }
    finally { setLoading(false); }
  }, []);

  const loadTeacherWorkspace = useCallback(async () => {
    if (!supabase || !profile || profile.role !== "teacher") return;
    setTeacherWorkspaceLoading(true);
    setError("");
    try {
      const yearRes = await supabase.from("school_academic_years").select("id,name").eq("is_current", true).maybeSingle();
      if (yearRes.error) throw yearRes.error;
      if (!yearRes.data) throw new Error("No current academic year is configured.");
      const currentYearId = yearRes.data.id;
      setAcademicYearId(currentYearId);
      const assignmentRes = await supabase.from("school_teacher_assignments")
        .select("id,teacher_id,section_id,subject_id,is_active")
        .eq("teacher_id", profile.id).eq("is_active", true);
      if (assignmentRes.error) throw assignmentRes.error;
      const assignmentRows = (assignmentRes.data || []) as Assignment[];
      if (!assignmentRows.length) {
        setTeacherAssignments([]);
        setTeacherRoster([]);
        setSelectedTeacherAssignmentId("");
        return;
      }
      const sectionIds = [...new Set(assignmentRows.map(a => a.section_id))];
      const subjectIds = [...new Set(assignmentRows.map(a => a.subject_id))];
      const [sectionsRes, subjectsRes, enrollmentsRes] = await Promise.all([
        supabase.from("school_sections").select("id,grade,section_name,academic_year_id").in("id", sectionIds),
        supabase.from("school_subjects").select("id,name,code,grade").in("id", subjectIds),
        supabase.from("school_enrollments").select("id,student_id,section_id,academic_year_id").eq("academic_year_id", currentYearId).in("section_id", sectionIds)
      ]);
      for (const result of [sectionsRes, subjectsRes, enrollmentsRes]) if (result.error) throw result.error;
      const sectionRows = (sectionsRes.data || []) as Section[];
      const subjectRows = (subjectsRes.data || []) as Subject[];
      const enrollRows = enrollmentsRes.data || [];
      const studentIds = [...new Set(enrollRows.map((row: any) => row.student_id))];
      let studentRows: any[] = [];
      if (studentIds.length) {
        const studentsRes = await supabase.from("school_students")
          .select("id,admission_number,first_name,middle_name,last_name,date_of_birth,gender,phone,address,is_active")
          .in("id", studentIds).eq("is_active", true).order("last_name").order("first_name");
        if (studentsRes.error) throw studentsRes.error;
        studentRows = studentsRes.data || [];
      }
      const mappedAssignments: TeacherAssignment[] = assignmentRows.flatMap(a => {
        const section = sectionRows.find(row => row.id === a.section_id);
        const subject = subjectRows.find(row => row.id === a.subject_id);
        return section && subject && section.academic_year_id === currentYearId ? [{ ...a, section, subject }] : [];
      });
      const mappedRoster: TeacherRosterStudent[] = studentRows.flatMap(student => {
        const enrollment = enrollRows.find((row: any) => row.student_id === student.id);
        const section = sectionRows.find(row => row.id === enrollment?.section_id);
        return enrollment && section ? [{ ...student, grade: section.grade, section: section.section_name, enrollment_id: enrollment.id, section_id: section.id }] : [];
      });
      setTeacherAssignments(mappedAssignments);
      setTeacherRoster(mappedRoster);
      setSelectedTeacherAssignmentId(current => mappedAssignments.some(a => a.id === current) ? current : mappedAssignments[0]?.id || "");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Unable to load your assigned classes.");
    } finally {
      setTeacherWorkspaceLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!supabase || !hasSupabase) { setSessionReady(true); return; }
    let alive = true;
    const verify = async (uid: string | undefined) => {
      if (!uid) {
        if (alive) {
          setProfile(null);
          setSessionReady(true);
        }
        return;
      }

      try {
        const { data, error: profileError } = await supabase!.from("school_profiles")
          .select("id,email,full_name,role,is_active")
          .eq("id", uid)
          .maybeSingle();

        if (!alive) return;

        if (profileError || !data || !data.is_active || !["admin", "teacher"].includes(data.role)) {
          await supabase!.auth.signOut();
          setProfile(null);
          fail(profileError?.message || "This account does not have an active administrator or teacher profile.");
        } else {
          setProfile(data as Profile);
          if (data.role === "teacher") setPage("results");
        }
      } catch (verificationError) {
        if (!alive) return;
        await supabase!.auth.signOut();
        setProfile(null);
        fail(verificationError instanceof Error ? verificationError.message : "Unable to verify this account.");
      } finally {
        if (alive) setSessionReady(true);
      }
    };
    supabase.auth.getSession().then(({ data }) => { void verify(data.session?.user.id); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void verify(session?.user.id); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (profile?.role === "admin") void loadSchoolData(); }, [profile, loadSchoolData]);
  useEffect(() => { if (profile?.role === "teacher") void loadTeacherWorkspace(); }, [profile, loadTeacherWorkspace]);

  const selectedTeacherAssignment = teacherAssignments.find(a => a.id === selectedTeacherAssignmentId);
  const selectedTeacherStudents = selectedTeacherAssignment
    ? teacherRoster.filter(student => student.section_id === selectedTeacherAssignment.section_id)
    : [];

  useEffect(() => {
    if (!supabase || !profile || profile.role !== "teacher" || !selectedTeacherAssignment || !marksAssessmentName.trim() || !academicYearId) {
      setTeacherMarks({});
      return;
    }
    let active = true;
    setTeacherResultsLoading(true);
    const loadMarks = async () => {
      try {
        const { data, error: resultsError } = await supabase!.from("school_results")
          .select("id,student_id,score,max_score,teacher_comment,entered_by,status")
          .eq("section_id", selectedTeacherAssignment.section_id)
          .eq("subject_id", selectedTeacherAssignment.subject_id)
          .eq("assessment_name", marksAssessmentName.trim())
          .eq("academic_year_id", academicYearId);
        if (resultsError) throw resultsError;
        if (!active) return;
        const next: Record<string, { score: string; comment: string; locked?: boolean }> = {};
        ((data || []) as TeacherResultRow[]).forEach(row => {
          next[row.student_id] = { score: String(row.score ?? ""), comment: row.teacher_comment || "", locked: row.entered_by !== profile.id || !["draft", "submitted"].includes(row.status) };
        });
        setTeacherMarks(next);
      } catch (e) {
        if (active) fail(e instanceof Error ? e.message : "Unable to load existing marks.");
      } finally {
        if (active) setTeacherResultsLoading(false);
      }
    };
    void loadMarks();
    return () => { active = false; };
  }, [profile, selectedTeacherAssignment, marksAssessmentName, academicYearId]);

  const saveTeacherResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile || profile.role !== "teacher" || !selectedTeacherAssignment || !academicYearId) return fail("Select one of your assigned classes first.");
    const maxScore = Number(assessmentMaxScore);
    if (!assessmentName.trim()) return fail("Enter the assessment name.");
    if (!Number.isFinite(maxScore) || maxScore <= 0) return fail("Maximum score must be greater than zero.");
    const entered = selectedTeacherStudents.filter(student => !teacherMarks[student.id]?.locked && teacherMarks[student.id]?.score !== undefined && teacherMarks[student.id]?.score.trim() !== "");
    if (!entered.length) return fail("Enter at least one student score before saving.");
    for (const student of entered) {
      const score = Number(teacherMarks[student.id].score);
      if (!Number.isFinite(score) || score < 0 || score > maxScore) return fail(`Enter a valid score between 0 and ${maxScore} for ${fullName(student)}.`);
    }
    setBusy(true);
    setError("");
    try {
      for (const student of entered) {
        const values = {
          student_id: student.id,
          section_id: selectedTeacherAssignment.section_id,
          subject_id: selectedTeacherAssignment.subject_id,
          academic_year_id: academicYearId,
          assessment_name: assessmentName.trim(),
          score: Number(teacherMarks[student.id].score),
          max_score: maxScore,
          teacher_comment: teacherMarks[student.id].comment.trim() || null,
          status: "draft",
          entered_by: profile.id,
          updated_at: new Date().toISOString()
        };
        const existingRes = await supabase.from("school_results").select("id,entered_by,status")
          .eq("student_id", student.id)
          .eq("section_id", selectedTeacherAssignment.section_id)
          .eq("subject_id", selectedTeacherAssignment.subject_id)
          .eq("assessment_name", assessmentName.trim())
          .eq("academic_year_id", academicYearId)
          .limit(1).maybeSingle();
        if (existingRes.error) throw existingRes.error;
        if (existingRes.data) {
          if (existingRes.data.entered_by !== profile.id || !["draft", "submitted"].includes(existingRes.data.status)) {
            throw new Error(`A protected result already exists for ${fullName(student)}. Ask the administrator to review it.`);
          }
          const { error: updateError } = await supabase.from("school_results").update(values).eq("id", existingRes.data.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from("school_results").insert(values);
          if (insertError) throw insertError;
        }
      }
      setMarksAssessmentName(assessmentName.trim());
      notify(`Saved ${entered.length} student result${entered.length === 1 ? "" : "s"} as draft. The administrator can review and publish them.`);
    } catch (e) {
      fail(e instanceof Error ? e.message : "Unable to save student results.");
    } finally {
      setBusy(false);
    }
  };

  const filteredStudents = useMemo(() => students.filter(s => s.grade === gradeFilter && s.section === sectionFilter && `${fullName(s)} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase())), [students, gradeFilter, sectionFilter, search]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase || !hasSupabase) return fail("Supabase is not configured.");
    setBusy(true); setError("");
    try { const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (authError) throw authError; setShowLogin(false); setPassword(""); }
    catch (e) { fail(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setBusy(false); }
  };

  const signOut = async () => { if (!supabase) return; await supabase.auth.signOut(); setProfile(null); setPage("overview"); setTeacherAssignments([]); setTeacherRoster([]); setTeacherMarks({}); notify("You have signed out."); };

  const saveStudent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase || !profile || !academicYearId) return fail("Administrator session or current academic year is missing.");
    if (!form.first_name.trim() || !form.last_name.trim()) return fail("First name and last name are required.");
    const section = sections.find(s => s.grade === Number(form.grade) && s.section_name === form.section);
    if (!section) return fail("The selected class section was not found for the current academic year.");
    setBusy(true); setError("");
    try {
      if (editing) {
        const update = { first_name: form.first_name.trim(), middle_name: form.middle_name.trim() || null, last_name: form.last_name.trim(), date_of_birth: form.date_of_birth || null, gender: form.gender || null, phone: form.phone.trim() || null, address: form.address.trim() || null };
        const { error: updateError } = await supabase.from("school_students").update(update).eq("id", editing.id);
        if (updateError) throw updateError;
        if (editing.enrollment_id) {
          const { error: enrollmentError } = await supabase.from("school_enrollments").update({ section_id: section.id, academic_year_id: academicYearId }).eq("id", editing.enrollment_id);
          if (enrollmentError) throw enrollmentError;
        } else {
          const { error: enrollmentError } = await supabase.from("school_enrollments").insert({ student_id: editing.id, section_id: section.id, academic_year_id: academicYearId });
          if (enrollmentError) throw enrollmentError;
        }
        notify("Student information and class allocation updated.");
      } else {
        const admission = `PYA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const { data: created, error: insertError } = await supabase.from("school_students").insert({ admission_number: admission, first_name: form.first_name.trim(), middle_name: form.middle_name.trim() || null, last_name: form.last_name.trim(), date_of_birth: form.date_of_birth || null, gender: form.gender || null, phone: form.phone.trim() || null, address: form.address.trim() || null, is_active: true }).select("id").single();
        if (insertError) throw insertError;
        const { error: enrollmentError } = await supabase.from("school_enrollments").insert({ student_id: created.id, section_id: section.id, academic_year_id: academicYearId });
        if (enrollmentError) {
          await supabase.from("school_students").delete().eq("id", created.id);
          throw enrollmentError;
        }
        notify(`Student registered successfully. Admission number: ${admission}`);
      }
      setForm({ ...EMPTY_FORM, grade: Number(form.grade), section: form.section }); setEditing(null); setGradeFilter(Number(form.grade)); setSectionFilter(form.section); await loadSchoolData();
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to save student."); }
    finally { setBusy(false); }
  };

  const saveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!subjectForm.name.trim()) return fail("Enter a subject name.");
    setBusy(true);
    try {
      const { error: saveError } = await supabase.from("school_subjects").insert({ name: subjectForm.name.trim(), code: subjectForm.code.trim() || null, grade: Number(subjectForm.grade) });
      if (saveError) throw saveError;
      setSubjectForm({ name: "", code: "", grade: 9 });
      notify("Subject added to the school curriculum.");
      await loadSchoolData();
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to add subject."); }
    finally { setBusy(false); }
  };

  const saveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!assignmentForm.teacher_id || !assignmentForm.section_id || !assignmentForm.subject_id) return fail("Select a teacher, class section and subject.");
    setBusy(true);
    try {
      const existing = await supabase.from("school_teacher_assignments").select("id").eq("teacher_id", assignmentForm.teacher_id).eq("section_id", assignmentForm.section_id).eq("subject_id", assignmentForm.subject_id).maybeSingle();
      if (existing.error) throw existing.error;
      const saveResult = existing.data
        ? await supabase.from("school_teacher_assignments").update({ is_active: true }).eq("id", existing.data.id)
        : await supabase.from("school_teacher_assignments").insert({ teacher_id: assignmentForm.teacher_id, section_id: assignmentForm.section_id, subject_id: assignmentForm.subject_id, is_active: true });
      if (saveResult.error) throw saveResult.error;
      notify("Teacher assignment saved.");
      await loadSchoolData();
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to save teacher assignment."); }
    finally { setBusy(false); }
  };

  const saveParentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!parentForm.parent_id || !parentForm.student_id) return fail("Select a parent account and student.");
    setBusy(true);
    try {
      const existing = await supabase.from("school_parent_student_links").select("id").eq("parent_id", parentForm.parent_id).eq("student_id", parentForm.student_id).maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) {
        const { error: saveError } = await supabase.from("school_parent_student_links").insert({ parent_id: parentForm.parent_id, student_id: parentForm.student_id });
        if (saveError) throw saveError;
      }
      notify(existing.data ? "This parent is already linked to the selected student." : "Parent linked to the selected student.");
      await loadSchoolData();
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to link parent."); }
    finally { setBusy(false); }
  };

  const toggleSchoolUser = async (user: SchoolUser) => {
    if (!supabase || !window.confirm(`${user.is_active ? "Deactivate" : "Activate"} ${user.full_name || user.email}?`)) return;
    setBusy(true);
    try {
      const { error: updateError } = await supabase.from("school_profiles").update({ is_active: !user.is_active }).eq("id", user.id);
      if (updateError) throw updateError;
      setSchoolUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      notify(`Account ${user.is_active ? "deactivated" : "activated"}.`);
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to update account."); }
    finally { setBusy(false); }
  };

  const beginEdit = (student: Student) => { setEditing(student); setForm({ first_name: student.first_name, middle_name: student.middle_name || "", last_name: student.last_name, date_of_birth: student.date_of_birth || "", gender: student.gender || "", phone: student.phone || "", address: student.address || "", grade: student.grade || 9, section: student.section === "—" ? "A" : student.section }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const removeStudent = async (student: Student) => {
    if (!supabase || !window.confirm(`Deactivate ${fullName(student)} (${student.admission_number})? Their historical records will be preserved.`)) return;
    setBusy(true);
    try {
      // Keep the student's historical record intact; deactivate the account instead of hard-deleting it.
      const { error: studentError } = await supabase.from("school_students").update({ is_active: false }).eq("id", student.id);
      if (studentError) throw studentError;
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: false } : s));
      notify("Student deactivated. Historical academic records have been preserved.");
    } catch (e) { fail(e instanceof Error ? e.message : "Unable to remove student."); }
    finally { setBusy(false); }
  };

  if (!sessionReady) return <div className="pya-app"><style>{CSS}</style><div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#d9b45b" }}>Loading secure school portal…</div></div>;

  if (!profile && showPublicLibrary) return <PyaAcademicHub profile={null} onBack={() => setShowPublicLibrary(false)} />;

  if (!profile) return <div className="pya-app"><style>{CSS}</style><div className="landing">
    <nav className="landing-nav"><div className="brand"><div className="brand-mark"><GraduationCap size={25}/></div><div><div className="brand-name">PRESTIGIOUS</div><div className="brand-sub">YOUTH ACADEMY</div></div></div><button className="outline-button" onClick={() => setShowLogin(true)}>STAFF SIGN IN</button></nav>
    <section className="hero"><div className="hero-photo" style={{ backgroundImage: `url("${HERO_IMAGES[heroIndex]}")`, opacity: 1 }}/><div className="hero-shade"/><div className="hero-content"><div className="hero-kicker">A LEGACY OF LEARNING AND LEADERSHIP</div><h1 className="serif">Inspiring Minds.<span className="gold-text">Building Futures.</span></h1><p className="hero-desc">Welcome to Prestigious Youth Academy — a community committed to academic excellence, creativity, character and the limitless potential of every learner.</p><div className="hero-actions"><button className="gold-button" onClick={() => setShowLogin(true)}>ENTER SCHOOL PORTAL <ArrowRight size={15} style={{ display: "inline", marginLeft: 8 }}/></button><button className="outline-button" onClick={() => setShowPublicLibrary(true)}>VISIT DIGITAL LIBRARY</button><a className="outline-button" href="#our-school" style={{ textDecoration: "none" }}>EXPLORE OUR ACADEMY</a></div></div><div className="hero-bottom"><div className="eyebrow">PRESTIGIOUS YOUTH ACADEMY • 2026/2027</div><div className="hero-dots">{HERO_IMAGES.map((im,i)=><button key={im} className={`hero-dot ${heroIndex===i?"active":""}`} onClick={()=>setHeroIndex(i)} aria-label={`Show image ${i+1}`}/>)}</div></div></section>
    <AchievementCard/>
    <section className="library-showcase" id="digital-library"><div className="library-showcase-inner"><div className="eyebrow">A WORLD OF KNOWLEDGE • PRESTIGIOUS YOUTH ACADEMY</div><h2 className="library-showcase-title">Welcome to the <span className="gold-text">Digital Library</span></h2><p className="library-showcase-copy">Explore books, reference materials, lesson notes, sample questions and past examination papers selected to support every learner’s academic journey.</p><button className="gold-button library-cta" onClick={() => setShowPublicLibrary(true)}>CLICK ME <ArrowRight size={15} style={{display:"inline",marginLeft:8}}/></button><div className="library-showcase-image-wrap"><img className="library-showcase-image" src="/library.jpg" alt="Prestigious Youth Academy Digital Library" loading="eager"/></div></div></section>
    <section className="landing-section" style={{paddingTop:15,background:"#0d0f0e"}}><div className="eyebrow">LIFE AT OUR ACADEMY</div><h2 className="section-heading">Learning in <span className="gold-text">Action.</span></h2><div className="activity-strip">{HERO_IMAGES.slice(1).map((im,i)=><div className="activity-tile" key={im}><img src={im} alt="Academy activities"/><span>{["Student Activities","Learning Together","School Community","Beyond the Classroom"][i]}</span></div>)}</div></section>
    <section className="landing-section" id="our-school"><div className="eyebrow">THE PRESTIGIOUS EXPERIENCE</div><h2 className="section-heading">More Than a School.<br/><span className="gold-text">A Place to Become.</span></h2><p className="muted" style={{maxWidth:650,lineHeight:1.9,fontSize:14}}>We nurture curiosity, strengthen academic foundations and create opportunities for students to discover their talents, develop confidence and prepare for tomorrow.</p><div className="feature-grid"><article className="feature-card"><div className="feature-icon"><TrophyIcon/></div><h3>Academic Excellence</h3><p>Meaningful learning, strong foundations and a culture of achievement.</p></article><article className="feature-card"><div className="feature-icon"><BookOpen/></div><h3>Discovery & Innovation</h3><p>Science, technology and practical learning that bring ideas to life.</p></article><article className="feature-card"><div className="feature-icon"><ShieldCheck/></div><h3>Character & Leadership</h3><p>Respect, responsibility, teamwork and the confidence to lead.</p></article></div></section>
<footer className="landing-footer"><span className="gold-text">PRESTIGIOUS YOUTH ACADEMY</span><span>Excellence • Discipline • Leadership</span><span>Academic Year 2026/2027</span></footer>
    {showLogin && <div className="login-overlay" onClick={()=>setShowLogin(false)}><div className="login-card" onClick={e=>e.stopPropagation()}><button onClick={()=>setShowLogin(false)} style={{float:"right",background:"none",border:0,color:"#aaa"}}><X/></button><div style={{textAlign:"center",padding:"10px 0 25px"}}><div className="brand-mark" style={{margin:"0 auto 15px",width:58,height:58}}><GraduationCap size={34}/></div><div className="eyebrow">SECURE STAFF ACCESS</div><h2 className="serif gold-text" style={{fontSize:28,margin:"9px 0"}}>School Portal</h2><p className="muted" style={{fontSize:11}}>Sign in with your registered administrator or teacher account.</p></div><form onSubmit={signIn}><label className="small-label">STAFF EMAIL</label><input className="login-input" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/><div style={{marginTop:16}}><label className="small-label">PASSWORD</label><input className="login-input" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></div><button className="gold-button" disabled={busy} style={{width:"100%",marginTop:24}}>{busy?"SIGNING IN…":"SIGN IN SECURELY"}</button></form><p style={{color:"#77786f",fontSize:10,lineHeight:1.7,textAlign:"center",marginTop:18}}>Access is controlled by your active school staff role and assigned permissions.</p></div></div>}
    {(error||notice)&&<div style={{position:"fixed",bottom:15,left:15,right:15,zIndex:1000}} className={`notice ${error?"error":"success"}`}>{error||notice}<button onClick={()=>{setError("");setNotice("")}}><X size={15}/></button></div>}
  </div></div>;

  return <div className="pya-app"><style>{CSS}</style><div className="portal"><aside className={`sidebar ${mobileNav?"open":""}`}><div className="side-brand"><div className="brand"><div className="brand-mark"><GraduationCap size={25}/></div><div><div className="brand-name" style={{fontSize:10}}>PRESTIGIOUS</div><div className="brand-sub">YOUTH ACADEMY</div></div></div></div>{profile.role === "admin" && <><div className="side-label">ADMINISTRATION</div><button className={`side-link ${page==="overview"?"active":""}`} onClick={()=>{setPage("overview");setMobileNav(false)}}><LayoutDashboard size={17}/>Overview</button><button className={`side-link ${page==="students"?"active":""}`} onClick={()=>{setPage("students");setMobileNav(false)}}><Users size={17}/>Students & Enrollment</button><button className={`side-link ${page==="staff"?"active":""}`} onClick={()=>{setPage("staff");setMobileNav(false)}}><ShieldCheck size={17}/>Staff & Academics</button></>}{profile.role === "teacher" && <><div className="side-label">TEACHING WORKSPACE</div><button className={`side-link ${page==="results"?"active":""}`} onClick={()=>{setPage("results");setMobileNav(false)}}><Users size={17}/>Student Results</button></>}<div className="side-label">ACADEMIC TOOLS</div><button className={`side-link ${page==="library"?"active":""}`} onClick={()=>{setPage("library");setMobileNav(false)}}><BookOpen size={17}/>Digital Library & Exams</button><div className="side-label">ACADEMIC YEAR</div><div style={{margin:"0 8px",padding:13,background:"#ffffff08",border:"1px solid #ffffff12",borderRadius:8}}><div style={{color:"#e4c77d",fontSize:12,fontWeight:800}}>2026 / 2027</div><div style={{color:"#77786f",fontSize:10,marginTop:5}}>Current session</div></div><div className="side-bottom"><div style={{display:"flex",alignItems:"center",gap:10,padding:"5px 8px 15px"}}><div className="avatar">{(profile.full_name||profile.email).charAt(0).toUpperCase()}</div><div style={{minWidth:0}}><div style={{fontSize:12,fontWeight:800}}>{profile.full_name||profile.email}</div><div style={{color:"#d4b45f",fontSize:10,marginTop:3}}>{profile.role === "admin" ? "Administrator" : "Teacher"}</div></div></div><button className="side-link" onClick={signOut}><LogOut size={17}/>Sign out</button></div></aside>
    <div className="portal-main"><header className="topbar"><div style={{display:"flex",alignItems:"center",gap:13}}><button className="mobile-menu" onClick={()=>setMobileNav(v=>!v)}><Menu size={19}/></button><div><div className="eyebrow" style={{fontSize:8}}>PRESTIGIOUS YOUTH ACADEMY</div><div style={{fontSize:13,fontWeight:800,marginTop:4}}>{page==="overview"?"Administrator Overview":page==="students"?"Student Management":page==="staff"?"Staff & Academic Setup":page==="results"?"Student Results & Assessment":"Digital Library & Exam Workspace"}</div></div></div><div className="topbar-user">{profile.role === "admin" ? <button onClick={()=>void loadSchoolData()} title="Refresh records" style={{border:"1px solid var(--line)",color:"#dfc579",background:"#ffffff06",padding:9,borderRadius:7}}><RefreshCw size={15}/></button> : <button onClick={()=>void loadTeacherWorkspace()} title="Refresh assigned classes" style={{border:"1px solid var(--line)",color:"#dfc579",background:"#ffffff06",padding:9,borderRadius:7}}><RefreshCw size={15}/></button>}<div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:800}}>{profile.full_name||profile.email}</div><div style={{fontSize:9,color:"#d9b45b",marginTop:3}}>{profile.role === "admin" ? "Administrator" : "Teacher"}</div></div><div className="avatar">{(profile.full_name||profile.email).charAt(0).toUpperCase()}</div></div></header>
    <main className="content">{(error||notice)&&<div className={`notice ${error?"error":"success"}`}><span style={{display:"flex",alignItems:"center",gap:9}}>{error?<AlertCircle size={17}/>:<CheckCircle2 size={17}/>} {error||notice}</span><button onClick={()=>{setError("");setNotice("")}} style={{background:"none",border:0,color:"inherit"}}><X size={16}/></button></div>}
    {page==="library"&&<PyaAcademicHub profile={profile} onBack={()=>setPage(profile.role === "admin" ? "overview" : "results")} onSignOut={signOut}/> }
    {profile.role === "teacher" && page==="results"&&<>
      <section className="teacher-hero"><div className="eyebrow">TEACHER WORKSPACE • 2026/2027</div><h1 className="serif" style={{fontSize:"clamp(27px,4vw,40px)",margin:"12px 0 8px"}}>Welcome, <span className="gold-text">{profile.full_name || "Teacher"}</span></h1><p style={{color:"#b8b7ad",fontSize:13,lineHeight:1.8,maxWidth:650,margin:0}}>Your assigned classes and subjects are ready. Select a class, prepare an assessment and enter student marks securely.</p><div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:20}}><div className="stat-pill">{teacherAssignments.length} assigned class-subjects</div><div className="stat-pill">{teacherRoster.length} enrolled students</div></div></section>
      <div className="stats-grid"><div className="stat-card"><div className="stat-top">Assigned Subjects <BookOpen size={17}/></div><div className="stat-value">{teacherAssignments.length}</div><div className="stat-note">Your active teaching allocations</div></div><div className="stat-card"><div className="stat-top">Students in Your Classes <Users size={17}/></div><div className="stat-value">{teacherRoster.length}</div><div className="stat-note">Current academic year</div></div><div className="stat-card"><div className="stat-top">Academic Session <LayoutDashboard size={17}/></div><div className="stat-value" style={{fontSize:22}}>2026/27</div><div className="stat-note">Current school year</div></div><div className="stat-card"><div className="stat-top">Results Workspace <CheckCircle2 size={17}/></div><div className="stat-value" style={{fontSize:22}}>Ready</div><div className="stat-note">Draft marks saved for admin review</div></div></div>
      {teacherWorkspaceLoading ? <section className="panel" style={{textAlign:"center",padding:35,color:"#d9b45b"}}>Loading your assigned classes and student register…</section> : !teacherAssignments.length ? <section className="panel" style={{textAlign:"center",padding:38}}><div className="feature-icon" style={{margin:"0 auto 15px"}}><BookOpen size={25}/></div><h2 className="panel-title">No teaching assignment yet</h2><p className="muted" style={{fontSize:12,lineHeight:1.8}}>Your administrator must assign you to a grade, section and subject. Once assigned, your student register and results entry form will appear here.</p></section> : <>
        <section className="panel" style={{marginBottom:17}}><h2 className="panel-title">Assessment Setup</h2><div className="result-toolbar"><div><label className="small-label">YOUR ASSIGNED CLASS & SUBJECT</label><select className="field" value={selectedTeacherAssignmentId} onChange={e=>setSelectedTeacherAssignmentId(e.target.value)}>{teacherAssignments.map(a=><option key={a.id} value={a.id}>Grade {a.section.grade} • Section {a.section.section_name} — {a.subject.name}</option>)}</select></div><div><label className="small-label">ASSESSMENT NAME *</label><input className="field" value={assessmentName} onChange={e=>{setAssessmentName(e.target.value);if(e.target.value.trim()!==marksAssessmentName.trim())setTeacherMarks({});}} placeholder="e.g. Midterm Examination"/><button type="button" className="outline-button" style={{padding:"8px 11px",marginTop:8,fontSize:9}} onClick={()=>setMarksAssessmentName(assessmentName.trim())}>LOAD SAVED MARKS</button></div><div><label className="small-label">MAXIMUM SCORE *</label><input className="field" type="number" min="1" step="0.5" value={assessmentMaxScore} onChange={e=>setAssessmentMaxScore(e.target.value)}/></div></div><p className="muted" style={{fontSize:11,lineHeight:1.7,marginTop:15}}>Marks are saved as drafts. The administrator reviews and publishes results before they become official student records.</p></section>
        <form onSubmit={saveTeacherResults} className="panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:18}}><div><div className="eyebrow">GRADE {selectedTeacherAssignment?.section.grade || "—"} • SECTION {selectedTeacherAssignment?.section.section_name || "—"}</div><h2 className="panel-title" style={{margin:"7px 0 0"}}>Student Results Register</h2></div><span className="stat-pill">{selectedTeacherStudents.length} students</span></div><div className="table-wrap"><table style={{minWidth:760}}><thead><tr><th>Admission No.</th><th>Student Name</th><th>Score / {assessmentMaxScore || "100"}</th><th>Teacher Comment</th></tr></thead><tbody>{selectedTeacherStudents.map(student=><tr key={student.id}><td style={{color:"#e6c978",fontWeight:800}}>{student.admission_number}</td><td style={{fontWeight:800,color:"#f0e8d4"}}>{fullName(student)}</td><td><input className="result-score-input" type="number" min="0" max={Number(assessmentMaxScore)||100} step="0.5" value={teacherMarks[student.id]?.score ?? ""} readOnly={teacherMarks[student.id]?.locked} onChange={e=>setTeacherMarks(prev=>({...prev,[student.id]:{score:e.target.value,comment:prev[student.id]?.comment||""}}))} placeholder="0.0" aria-label={`Score for ${fullName(student)}`}/></td><td><input className="result-comment-input" value={teacherMarks[student.id]?.comment ?? ""} readOnly={teacherMarks[student.id]?.locked} onChange={e=>setTeacherMarks(prev=>({...prev,[student.id]:{score:prev[student.id]?.score||"",comment:e.target.value}}))} placeholder="Optional feedback" aria-label={`Comment for ${fullName(student)}`}/></td></tr>)}{!selectedTeacherStudents.length&&<tr><td colSpan={4} style={{textAlign:"center",padding:30}}>No active students are enrolled in this assigned section.</td></tr>}</tbody></table></div><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginTop:20}}><span className="muted" style={{fontSize:11}}>{teacherResultsLoading?"Loading saved marks…":"Enter marks for the students listed above."}</span><button className="gold-button" disabled={busy||teacherResultsLoading||!selectedTeacherStudents.length}>{busy?"SAVING RESULTS…":"SAVE STUDENT RESULTS"} <ArrowRight size={14} style={{display:"inline",marginLeft:7}}/></button></div></form>
      </>}
      <section className="panel" style={{marginTop:18,display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap"}}><div><div className="eyebrow">TEACHING RESOURCES</div><h2 className="panel-title" style={{margin:"7px 0"}}>Digital Library & Examination Workspace</h2><p className="muted" style={{fontSize:11,margin:0}}>Access learning resources, upload materials and submit examination papers for review.</p></div><button className="outline-button" onClick={()=>setPage("library")}>OPEN DIGITAL LIBRARY <ArrowRight size={14} style={{display:"inline",marginLeft:7}}/></button></section>
    </>}
    {profile.role === "admin" && page==="overview"&&<><section className="welcome-banner"><div className="eyebrow">EXECUTIVE WORKSPACE</div><h1 className="serif" style={{fontSize:"clamp(27px,4vw,39px)",margin:"12px 0 8px"}}>Welcome, <span className="gold-text">{profile.full_name||"Administrator"}</span></h1><p style={{color:"#aaa99e",fontSize:12,lineHeight:1.8,maxWidth:570}}>Manage official student records and class enrollment for the 2026/2027 academic year.</p><button className="gold-button" onClick={()=>setPage("students")}>MANAGE STUDENTS <ArrowRight size={13} style={{display:"inline",marginLeft:6}}/></button></section><div className="stats-grid"><div className="stat-card"><div className="stat-top">Registered Students <Users size={17}/></div><div className="stat-value">{loading?"—":students.length}</div><div className="stat-note">Student identity records</div></div><div className="stat-card"><div className="stat-top">Grade Levels <BookOpen size={17}/></div><div className="stat-value">12</div><div className="stat-note">Grade 1 through 12</div></div><div className="stat-card"><div className="stat-top">Class Sections <LayoutDashboard size={17}/></div><div className="stat-value">{sections.length||60}</div><div className="stat-note">Five sections per grade</div></div><div className="stat-card"><div className="stat-top">Planned Capacity <Users size={17}/></div><div className="stat-value">2,400</div><div className="stat-note">40 students per section</div></div></div><section className="panel"><h3 className="panel-title">System readiness</h3><p className="muted" style={{fontSize:12,lineHeight:1.8}}>Administrator authentication is connected to Supabase. Student records and class enrollments are stored in the new school database. Teacher and parent profile management, subject setup, teacher-class assignments and parent-child links are now available in Staff & Academic Setup. Digital Library uploads, teacher exam submissions and administrator-only AI exam reviews are available in Digital Library & Exams.</p><button className="outline-button" onClick={()=>setPage("students")}>OPEN STUDENT REGISTER</button></section></>}
    {profile.role === "admin" && page==="students"&&<><div style={{marginBottom:20}}><div className="eyebrow">ACADEMIC RECORDS • 2026/2027</div><h1 className="page-title" style={{marginTop:9}}>Student Management</h1><p className="page-sub">Register, update, allocate and remove official student records.</p></div><div className="stats-grid"><div className="stat-card"><div className="stat-top">Total Students <Users size={17}/></div><div className="stat-value">{students.length}</div><div className="stat-note">All student records</div></div><div className="stat-card"><div className="stat-top">Grade Levels <BookOpen size={17}/></div><div className="stat-value">12</div><div className="stat-note">Grade 1–12</div></div><div className="stat-card"><div className="stat-top">Class Sections <LayoutDashboard size={17}/></div><div className="stat-value">{sections.length}</div><div className="stat-note">Available in current year</div></div><div className="stat-card"><div className="stat-top">Current Capacity <Users size={17}/></div><div className="stat-value">{students.length}/2400</div><div className="stat-note">Planned school capacity</div></div></div>
    <section className="panel" style={{marginBottom:16}}><h3 className="panel-title"><Plus size={17} style={{display:"inline",marginRight:8}}/>{editing?"Update Student Record":"Register a Student"}</h3><form onSubmit={saveStudent} className="form-grid"><div><label className="small-label">FIRST NAME *</label><input className="field" required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="First name"/></div><div><label className="small-label">MIDDLE NAME</label><input className="field" value={form.middle_name} onChange={e=>setForm({...form,middle_name:e.target.value})} placeholder="Middle name"/></div><div><label className="small-label">LAST NAME *</label><input className="field" required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Last name"/></div><div><label className="small-label">DATE OF BIRTH</label><input className="field" type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></div><div><label className="small-label">GENDER</label><select className="field" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div><div><label className="small-label">PHONE</label><input className="field" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Student/guardian phone"/></div><div><label className="small-label">GRADE *</label><select className="field" value={form.grade} onChange={e=>setForm({...form,grade:Number(e.target.value)})}>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div><div><label className="small-label">SECTION *</label><select className="field" value={form.section} onChange={e=>setForm({...form,section:e.target.value})}>{sections.filter(s=>s.grade===Number(form.grade)).map(s=><option key={s.id} value={s.section_name}>Section {s.section_name}</option>)}</select></div><div className="full"><label className="small-label">ADDRESS</label><input className="field" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Student address"/></div><div className="full" style={{display:"flex",gap:9,flexWrap:"wrap"}}><button className="gold-button" disabled={busy}>{busy?(editing?"UPDATING…":"REGISTERING…"):(editing?"SAVE CHANGES":"REGISTER STUDENT +")}</button>{editing&&<button type="button" className="outline-button" onClick={()=>{setEditing(null);setForm(EMPTY_FORM)}}>CANCEL EDIT</button>}</div></form></section>
    <section className="panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:17}}><h3 className="panel-title" style={{margin:0}}>Official Student Register</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><select className="field" style={{width:115}} value={gradeFilter} onChange={e=>setGradeFilter(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select><input className="field" style={{width:160}} placeholder="Search name / ID…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>{["A","B","C","D","E"].map(s=><button key={s} className={sectionFilter===s?"gold-button":"outline-button"} style={{padding:"8px 15px",fontSize:11}} onClick={()=>setSectionFilter(s)}>{s}</button>)}</div><div className="table-wrap"><table><thead><tr><th>Admission No.</th><th>Student Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Grade / Section</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredStudents.map(st=><tr key={st.id}><td style={{color:"#e6c978",fontWeight:800}}>{st.admission_number}</td><td style={{fontWeight:800,color:"#f0e8d4"}}>{fullName(st)}</td><td>{ageFromDob(st.date_of_birth)}</td><td>{st.gender||"—"}</td><td>{st.phone||"—"}</td><td>Grade {st.grade} • {st.section}</td><td>{st.is_active?"Active":"Inactive"}</td><td><div style={{display:"flex",gap:7}}><button title="Edit student" className="outline-button" style={{padding:7}} onClick={()=>beginEdit(st)}><Pencil size={14}/></button><button title="Deactivate student" className="outline-button" style={{padding:7,color:"#e58b82",borderColor:"#7b3934"}} disabled={busy} onClick={()=>void removeStudent(st)}><Trash2 size={14}/></button></div></td></tr>)}{!filteredStudents.length&&<tr><td colSpan={8} style={{textAlign:"center",padding:35,color:"#85867d"}}>No students found in Grade {gradeFilter}, Section {sectionFilter}.</td></tr>}</tbody></table></div></section></>}
    {profile.role === "admin" && page==="staff"&&<><div style={{marginBottom:20}}><div className="eyebrow">SCHOOL OPERATIONS • 2026/2027</div><h1 className="page-title" style={{marginTop:9}}>Staff & Academic Setup</h1><p className="page-sub">Manage teacher and parent accounts, subjects, class teaching assignments and parent-child access.</p></div>
      <StaffAccountManager onCreated={() => void loadSchoolData()} />
      <section className="panel" style={{marginBottom:16}}><h3 className="panel-title">Teacher & Parent Accounts</h3><p className="muted" style={{fontSize:11,lineHeight:1.7}}>Accounts must first be created in Supabase Authentication and given a matching school profile. This page manages the active status of those existing profiles; it does not create passwords or expose privileged credentials.</p><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{schoolUsers.map(u=><tr key={u.id}><td>{u.full_name||"—"}</td><td>{u.email}</td><td style={{textTransform:"capitalize"}}>{u.role}</td><td>{u.is_active?"Active":"Inactive"}</td><td><button className="outline-button" style={{padding:"7px 10px"}} disabled={busy} onClick={()=>void toggleSchoolUser(u)}>{u.is_active?"Deactivate":"Activate"}</button></td></tr>)}{!schoolUsers.length&&<tr><td colSpan={5} style={{textAlign:"center",padding:22,color:"#85867d"}}>No teacher or parent profiles found yet.</td></tr>}</tbody></table></div></section>
      <div className="panel-grid"><section className="panel"><h3 className="panel-title">Add Curriculum Subject</h3><form className="form-grid" onSubmit={saveSubject}><div className="full"><label className="small-label">SUBJECT NAME *</label><input className="field" required value={subjectForm.name} onChange={e=>setSubjectForm({...subjectForm,name:e.target.value})} placeholder="e.g. Mathematics"/></div><div><label className="small-label">SUBJECT CODE</label><input className="field" value={subjectForm.code} onChange={e=>setSubjectForm({...subjectForm,code:e.target.value})} placeholder="e.g. MATH"/></div><div><label className="small-label">GRADE *</label><select className="field" value={subjectForm.grade} onChange={e=>setSubjectForm({...subjectForm,grade:Number(e.target.value)})}>{Array.from({length:12},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div><div className="full"><button className="gold-button" disabled={busy}>ADD SUBJECT</button></div></form><div className="table-wrap" style={{marginTop:18}}><table><thead><tr><th>Subject</th><th>Code</th><th>Grade</th></tr></thead><tbody>{subjects.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.code||"—"}</td><td>{s.grade}</td></tr>)}{!subjects.length&&<tr><td colSpan={3}>No subjects configured.</td></tr>}</tbody></table></div></section>
      <section className="panel"><h3 className="panel-title">Assign Teacher to Class & Subject</h3><form className="form-grid" onSubmit={saveAssignment}><div className="full"><label className="small-label">TEACHER *</label><select className="field" required value={assignmentForm.teacher_id} onChange={e=>setAssignmentForm({...assignmentForm,teacher_id:e.target.value})}><option value="">Select teacher</option>{schoolUsers.filter(u=>u.role==="teacher"&&u.is_active).map(u=><option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}</select></div><div><label className="small-label">CLASS SECTION *</label><select className="field" required value={assignmentForm.section_id} onChange={e=>setAssignmentForm({...assignmentForm,section_id:e.target.value})}><option value="">Select class</option>{sections.map(s=><option key={s.id} value={s.id}>Grade {s.grade} • {s.section_name}</option>)}</select></div><div><label className="small-label">SUBJECT *</label><select className="field" required value={assignmentForm.subject_id} onChange={e=>setAssignmentForm({...assignmentForm,subject_id:e.target.value})}><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>Grade {s.grade} • {s.name}</option>)}</select></div><div className="full"><button className="gold-button" disabled={busy}>SAVE TEACHER ASSIGNMENT</button></div></form><div className="table-wrap" style={{marginTop:18}}><table><thead><tr><th>Teacher</th><th>Class</th><th>Subject</th></tr></thead><tbody>{assignments.map(a=>{const u=schoolUsers.find(x=>x.id===a.teacher_id);const sec=sections.find(x=>x.id===a.section_id);const sub=subjects.find(x=>x.id===a.subject_id);return <tr key={a.id}><td>{u?.full_name||u?.email||"Unknown teacher"}</td><td>{sec?`Grade ${sec.grade} • ${sec.section_name}`:"—"}</td><td>{sub?.name||"—"}</td></tr>})}{!assignments.length&&<tr><td colSpan={3}>No active assignments yet.</td></tr>}</tbody></table></div></section></div>
      <section className="panel" style={{marginTop:16}}><h3 className="panel-title">Connect Parent to Student</h3><form className="form-grid" onSubmit={saveParentLink}><div><label className="small-label">PARENT ACCOUNT *</label><select className="field" required value={parentForm.parent_id} onChange={e=>setParentForm({...parentForm,parent_id:e.target.value})}><option value="">Select parent</option>{schoolUsers.filter(u=>u.role==="parent"&&u.is_active).map(u=><option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}</select></div><div><label className="small-label">STUDENT *</label><select className="field" required value={parentForm.student_id} onChange={e=>setParentForm({...parentForm,student_id:e.target.value})}><option value="">Select student</option>{students.filter(st=>st.is_active).map(st=><option key={st.id} value={st.id}>{fullName(st)} • {st.admission_number}</option>)}</select></div><div className="full"><button className="gold-button" disabled={busy}>LINK PARENT TO STUDENT</button></div></form><div className="table-wrap" style={{marginTop:18}}><table><thead><tr><th>Parent</th><th>Student</th><th>Admission No.</th></tr></thead><tbody>{parentLinks.map(l=>{const u=schoolUsers.find(x=>x.id===l.parent_id);const st=students.find(x=>x.id===l.student_id);return <tr key={l.id}><td>{u?.full_name||u?.email||"Parent profile"}</td><td>{st?fullName(st):"Student record"}</td><td>{st?.admission_number||"—"}</td></tr>})}{!parentLinks.length&&<tr><td colSpan={3}>No parent-child links configured.</td></tr>}</tbody></table></div></section>
    </>}
    {loading&&<div className="panel" style={{marginTop:18,textAlign:"center",color:"#d9b45b",fontSize:12}}>Loading academy records…</div>}
    <footer style={{borderTop:"1px solid var(--line)",marginTop:35,padding:"22px 0 8px",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",color:"#686a62",fontSize:9,letterSpacing:1}}><span>PRESTIGIOUS YOUTH ACADEMY</span><span>EXCELLENCE • DISCIPLINE • LEADERSHIP</span><span>2026 / 2027</span></footer></main></div></div></div>;
}

function TrophyIcon() { return <GraduationCap size={29}/>; }
