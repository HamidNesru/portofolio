
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Users, BookOpen, FileCheck2, MessageSquare,
  Image as ImageIcon, LogOut, Plus, Sparkles, Send, Search,
  RefreshCw, AlertCircle, CheckCircle2, X, LayoutDashboard,
  Menu, ArrowRight, Award, CalendarDays, ChevronRight,
  ShieldCheck, Trophy, Microscope, Code2, Dumbbell,
  Clock3, TrendingUp, Bell, Globe2
} from "lucide-react";
import { supabase, hasSupabase } from "./supabase";

type UserRole = "Admin" | "Teacher" | "Parent";
type Page = "overview" | "students" | "exams" | "chat" | "gallery";

interface StudentRecord {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  age: number;
  ws1: number;
  test1: number;
  ws2: number;
  test2: number;
  ws3: number;
  mid_exam: number;
  ws4: number;
  final_exam: number;
}

interface ExamSubmission {
  id: string;
  teacher_name: string;
  subject: string;
  grade: number;
  exam_type: string;
  exam_content: string;
  ai_score: number;
  ai_feedback: string;
  submitted_at: string;
}

interface ChatMessage {
  id: string;
  sender_role: string;
  sender_name: string;
  student_name: string;
  body: string;
  created_at: string;
}

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

const SECTIONS = ["A", "B", "C", "D", "E"];

const ASSESSMENTS = [
  { key: "ws1", label: "Worksheet 1", max: 5 },
  { key: "test1", label: "Test 1", max: 10 },
  { key: "ws2", label: "Worksheet 2", max: 5 },
  { key: "test2", label: "Test 2", max: 10 },
  { key: "ws3", label: "Worksheet 3", max: 5 },
  { key: "mid_exam", label: "Mid Exam", max: 20 },
  { key: "ws4", label: "Worksheet 4", max: 5 },
  { key: "final_exam", label: "Final Exam", max: 40 }
] as const;

type AssessmentKey = (typeof ASSESSMENTS)[number]["key"];

const HERO_IMAGES = [
  "/prestpro.png",
  "/prest22.jpg",
  "/prest23.jpg",
  "/prest9.jpg",
  "/prest7.jpg"
];

const EMPTY_STUDENT = {
  full_name: "",
  grade: 9,
  section: "A",
  age: 15
};

const EMPTY_EXAM = {
  teacher_name: "",
  subject: "",
  grade: 9,
  exam_type: "Final Exam (40%)",
  exam_content: ""
};

const EMPTY_GALLERY = {
  title: "",
  category: "School Activity",
  image_url: ""
};

function getTotalScore(student: StudentRecord) {
  return ASSESSMENTS.reduce(
    (total, assessment) => total + (Number(student[assessment.key]) || 0),
    0
  );
}

function safeDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function evaluateExamQuality(subject: string, grade: number, content: string) {
  const text = content.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const analytical =
    /(analyze|compare|evaluate|calculate|explain|derive|justify|discuss)/i.test(text);
  const numbered = /(\b1[.)]|\b2[.)]|\bQ1|\bQuestion\s*1)/i.test(text);
  const marks = /\b\d+\s*marks?\b|\[\s*\d+\s*\]/i.test(text);

  let score = 55;
  if (words >= 20) score += 10;
  if (words >= 50) score += 10;
  if (analytical) score += 10;
  if (numbered) score += 5;
  if (marks) score += 10;

  return {
    score: Math.min(score, 95),
    feedback:
      `Preliminary assessment for Grade ${grade} ${subject}. Word count: ${words}. ` +
      `Analytical questions: ${analytical ? "Detected" : "Not detected"}. ` +
      `Numbering: ${numbered ? "Detected" : "Not detected"}. ` +
      `Mark allocation: ${marks ? "Detected" : "Not detected"}. ` +
      "A qualified teacher should verify curriculum alignment, accuracy, difficulty and marking fairness."
  };
}

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

export default function App() {
  const [user, setUser] = useState<{ name: string; role: UserRole } | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginRole, setLoginRole] = useState<UserRole>("Admin");
  const [heroIndex, setHeroIndex] = useState(0);
  const [failedHero, setFailedHero] = useState<string[]>([]);
  const [mobileNav, setMobileNav] = useState(false);

  const [activePage, setActivePage] = useState<Page>("overview");
  const [selectedGrade, setSelectedGrade] = useState(9);
  const [selectedSection, setSelectedSection] = useState("A");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [exams, setExams] = useState<ExamSubmission[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const [examForm, setExamForm] = useState(EMPTY_EXAM);
  const [chatInput, setChatInput] = useState("");
  const [chatStudentRef, setChatStudentRef] = useState("");
  const [galleryForm, setGalleryForm] = useState(EMPTY_GALLERY);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex(index => (index + 1) % HERO_IMAGES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const notify = (message: string) => {
    setNotice(message);
    setError("");
  };

  const reportError = (message: string) => {
    setError(message);
    setNotice("");
  };

  const loadData = useCallback(async () => {
    if (!hasSupabase || !supabase) {
      setLoading(false);
      reportError("Supabase is not configured. Check your Vercel environment variables.");
      return;
    }

   const loadData = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const client = supabase;

    if (!client) {
      throw new Error(
        "Supabase is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
      );
    }

    const results = await Promise.all([
      client.from("students").select("*").order("full_name"),
      client.from("exams").select("*").order("submitted_at", { ascending: false }),
      client.from("messages").select("*").order("created_at"),
      client.from("gallery").select("*").order("created_at", { ascending: false })
    ]);


    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.error) {
        console.error(`${labels[i]} loading error:`, result.error);
        errors.push(`${labels[i]}: ${result.error.message}`);
      }
    }

    if (results[0].data) setStudents(results[0].data as StudentRecord[]);
    if (results[1].data) setExams(results[1].data as ExamSubmission[]);
    if (results[2].data) setMessages(results[2].data as ChatMessage[]);
    if (results[3].data) setGallery(results[3].data as GalleryItem[]);

    if (errors.length) {
      reportError(errors.join(" | "));
    }
  } catch (err) {
    reportError(
      err instanceof Error ? err.message : "Unable to load school records."
    );
  } finally {
    setLoading(false);
  }
}, []);
      
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        if (results[i].error) {
          console.error(`${labels[i]} loading error:`, results[i].error);
          errors.push(`${labels[i]}: ${results[i].error.message}`);
        }
      }

      if (results[0].data) setStudents(results[0].data as StudentRecord[]);
      if (results[1].data) setExams(results[1].data as ExamSubmission[]);
      if (results[2].data) setMessages(results[2].data as ChatMessage[]);
      if (results[3].data) setGallery(results[3].data as GalleryItem[]);

      if (errors.length) reportError(errors.join(" | "));
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Unable to load school records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(student =>
      Number(student.grade) === selectedGrade &&
      student.section === selectedSection &&
      String(student.full_name || "").toLowerCase().includes(query)
    );
  }, [students, selectedGrade, selectedSection, search]);

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newStudent.full_name.trim()) return reportError("Enter the student's full name.");
    if (newStudent.grade < 1 || newStudent.grade > 12) return reportError("Choose a grade from 1 to 12.");
    if (!SECTIONS.includes(newStudent.section)) return reportError("Choose a valid section.");
    if (newStudent.age < 5 || newStudent.age > 25) return reportError("Student age must be between 5 and 25.");

    const count = students.filter(s =>
      Number(s.grade) === Number(newStudent.grade) && s.section === newStudent.section
    ).length;

    if (count >= 40) return reportError("This section already contains 40 students.");
    if (!supabase || !hasSupabase) return reportError("Supabase is not configured.");

    const record = {
      ...newStudent,
      full_name: newStudent.full_name.trim(),
      grade: Number(newStudent.grade),
      age: Number(newStudent.age),
      ws1: 0, test1: 0, ws2: 0, test2: 0,
      ws3: 0, mid_exam: 0, ws4: 0, final_exam: 0
    };

    setBusy(true);
    try {
      const { data, error: dbError } = await supabase.from("students").insert([record]).select().single();
      if (dbError) throw dbError;
      setStudents(previous => [...previous, data as StudentRecord]);
      setSelectedGrade(record.grade);
      setSelectedSection(record.section);
      setNewStudent({ ...EMPTY_STUDENT, grade: record.grade, section: record.section });
      notify("Student successfully registered.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Student registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateMark = async (student: StudentRecord, key: AssessmentKey, value: number) => {
    const assessment = ASSESSMENTS.find(item => item.key === key);
    if (!assessment || !Number.isFinite(value) || value < 0 || value > assessment.max) {
      reportError(`Enter a mark between 0 and ${assessment?.max ?? 0}.`);
      return false;
    }
    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return false;
    }

    try {
      const { error: dbError } = await supabase.from("students").update({ [key]: value }).eq("id", student.id);
      if (dbError) throw dbError;
      setStudents(previous => previous.map(item =>
        item.id === student.id ? { ...item, [key]: value } : item
      ));
      notify(`${assessment.label} mark updated.`);
      return true;
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Unable to update mark.");
      return false;
    }
  };

  const handleExamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!examForm.subject.trim() || !examForm.exam_content.trim()) return reportError("Enter the subject and exam questions.");
    if (!supabase || !hasSupabase) return reportError("Supabase is not configured.");

    const evaluation = evaluateExamQuality(examForm.subject, Number(examForm.grade), examForm.exam_content);
    const submission = {
      teacher_name: examForm.teacher_name.trim() || user?.name || "Teacher",
      subject: examForm.subject.trim(),
      grade: Number(examForm.grade),
      exam_type: examForm.exam_type,
      exam_content: examForm.exam_content.trim(),
      ai_score: evaluation.score,
      ai_feedback: evaluation.feedback,
      submitted_at: new Date().toISOString()
    };

    setBusy(true);
    try {
      const { data, error: dbError } = await supabase.from("exams").insert([submission]).select().single();
      if (dbError) throw dbError;
      setExams(previous => [data as ExamSubmission, ...previous]);
      setExamForm({ ...EMPTY_EXAM, teacher_name: user?.name || "" });
      notify("Examination submitted successfully.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Exam submission failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatStudentRef.trim()) return reportError("Enter a student reference and message.");
    if (!supabase || !hasSupabase) return reportError("Supabase is not configured.");

    const record = {
      sender_role: user?.role || "Parent",
      sender_name: user?.name || "User",
      student_name: chatStudentRef.trim(),
      body: chatInput.trim(),
      created_at: new Date().toISOString()
    };

    setBusy(true);
    try {
      const { data, error: dbError } = await supabase.from("messages").insert([record]).select().single();
      if (dbError) throw dbError;
      setMessages(previous => [...previous, data as ChatMessage]);
      setChatInput("");
      notify("Message sent successfully.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!galleryForm.title.trim() || !galleryForm.image_url.trim()) return reportError("Enter an event title and image URL.");

    try {
      const url = new URL(galleryForm.image_url.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return reportError("Enter a valid HTTP or HTTPS image URL.");
    }

    if (!supabase || !hasSupabase) return reportError("Supabase is not configured.");

    setBusy(true);
    try {
      const { data, error: dbError } = await supabase.from("gallery").insert([{
        title: galleryForm.title.trim(),
        category: galleryForm.category.trim() || "School Activity",
        image_url: galleryForm.image_url.trim()
      }]).select().single();

      if (dbError) throw dbError;
      setGallery(previous => [data as GalleryItem, ...previous]);
      setGalleryForm(EMPTY_GALLERY);
      notify("Gallery item added.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Gallery item could not be added.");
    } finally {
      setBusy(false);
    }
  };

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={17} /> },
    { id: "students", label: "Students & Marks", icon: <Users size={17} /> },
    { id: "exams", label: "Examination Board", icon: <FileCheck2 size={17} /> },
    { id: "chat", label: "Parent Communication", icon: <MessageSquare size={17} /> },
    { id: "gallery", label: "School Gallery", icon: <ImageIcon size={17} /> }
  ];

  const pageTitle = navItems.find(item => item.id === activePage)?.label || "Overview";

  const changePage = (page: Page) => {
    setActivePage(page);
    setMobileNav(false);
  };

  const statCards = [
    { label: "Enrolled Students", value: students.length, icon: <Users size={18} />, note: "Registered student records" },
    { label: "Examinations", value: exams.length, icon: <FileCheck2 size={18} />, note: "Teacher submissions" },
    { label: "Messages", value: messages.length, icon: <MessageSquare size={18} />, note: "Parent & teacher messages" },
    { label: "Activities", value: gallery.length, icon: <ImageIcon size={18} />, note: "Published gallery entries" }
  ];

  if (!user) {
    return (
      <div className="pya-app">
        <style>{CSS}</style>
        <div className="landing">
          <header className="landing-nav">
            <div className="brand">
              <div className="brand-mark"><GraduationCap size={27} /></div>
              <div>
                <div className="brand-name">PRESTIGIOUS YOUTH ACADEMY</div>
                <div className="brand-sub">EXCELLENCE • DISCIPLINE • LEADERSHIP</div>
              </div>
            </div>
            <button className="gold-button" onClick={() => setShowLogin(true)}>PORTAL LOGIN <ArrowRight size={14} style={{ display: "inline", marginLeft: 7 }} /></button>
          </header>

          <section className="hero">
            {HERO_IMAGES.map((src, index) => (
              <div
                key={src}
                className="hero-photo"
                style={{
                  backgroundImage: failedHero.includes(src) ? "none" : `url("${src}")`,
                  opacity: heroIndex === index && !failedHero.includes(src) ? 1 : 0
                }}
              />
            ))}
            <div className="hero-shade" />
            <div className="hero-content">
              <div className="hero-kicker">A LEGACY OF LEARNING AND LEADERSHIP</div>
              <h1 className="serif">
                Inspiring Minds.
                <span className="gold-text">Building Futures.</span>
              </h1>
              <p className="hero-desc">
                Welcome to Prestigious Youth Academy — a community committed to
                academic excellence, creativity, character and the limitless
                potential of every learner.
              </p>
              <div className="hero-actions">
                <button className="gold-button" onClick={() => setShowLogin(true)}>
                  ENTER SCHOOL PORTAL <ArrowRight size={15} style={{ display: "inline", marginLeft: 8 }} />
                </button>
                <a className="outline-button" href="#our-school" style={{ textDecoration: "none" }}>
                  EXPLORE OUR ACADEMY
                </a>
              </div>
            </div>
            <div className="hero-bottom">
              <div className="eyebrow">PRESTIGIOUS YOUTH ACADEMY · 2026/2027</div>
              <div className="hero-dots">
                {HERO_IMAGES.map((src, index) => (
                  <button
                    key={src}
                    className={`hero-dot ${heroIndex === index ? "active" : ""}`}
                    onClick={() => setHeroIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="landing-section" id="our-school">
            <div className="eyebrow">THE PRESTIGIOUS EXPERIENCE</div>
            <h2 className="section-heading">More Than a School.<br /><span className="gold-text">A Place to Become.</span></h2>
            <p className="muted" style={{ maxWidth: 650, lineHeight: 1.9, fontSize: 14 }}>
              We nurture curiosity, strengthen academic foundations and create
              opportunities for students to discover their talents, develop
              confidence and prepare for tomorrow.
            </p>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon"><Trophy size={29} /></div>
                <h3>Academic Excellence</h3>
                <p>Meaningful learning, strong foundations and a culture of achievement.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon"><Microscope size={29} /></div>
                <h3>Discovery & Innovation</h3>
                <p>Science, technology and practical learning that bring ideas to life.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon"><Award size={29} /></div>
                <h3>Character & Leadership</h3>
                <p>Respect, responsibility, teamwork and the confidence to lead.</p>
              </article>
            </div>
          </section>

          <section className="landing-section" style={{ paddingTop: 15, background: "#0d0f0e" }}>
            <div className="eyebrow">LIFE AT OUR ACADEMY</div>
            <h2 className="section-heading">Learning in <span className="gold-text">Action.</span></h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
              Exploring, creating, competing and growing together.
            </p>
            <div className="activity-strip">
              {[
                { src: "/prest22.jpg", label: "Student Activities" },
                { src: "/prest23.jpg", label: "Learning Together" },
                { src: "/prest9.jpg", label: "School Community" },
                { src: "/prest7.jpg", label: "Beyond the Classroom" }
              ].map(item => (
                <div className="activity-tile" key={item.src}>
                  <img src={item.src} alt={item.label} onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="landing-footer">
            <span className="gold-text" style={{ fontWeight: 800, letterSpacing: 2 }}>PRESTIGIOUS YOUTH ACADEMY</span>
            <span>Excellence • Discipline • Leadership</span>
            <span>Academic Year 2026/2027</span>
          </footer>
        </div>

        {showLogin && (
          <div className="login-overlay" onClick={() => setShowLogin(false)}>
            <div className="login-card" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLogin(false)} style={{ float: "right", background: "none", border: 0, color: "#aaa" }} aria-label="Close"><X size={21} /></button>
              <div style={{ textAlign: "center", padding: "10px 0 25px" }}>
                <div className="brand-mark" style={{ margin: "0 auto 15px", width: 58, height: 58 }}><GraduationCap size={34} /></div>
                <div className="eyebrow">WELCOME BACK</div>
                <h2 className="serif gold-text" style={{ fontSize: 28, margin: "9px 0" }}>School Portal</h2>
                <p className="muted" style={{ fontSize: 11 }}>Access the academy management workspace</p>
              </div>
              <form onSubmit={e => {
                e.preventDefault();
                if (!loginName.trim()) return;
                setUser({ name: loginName.trim(), role: loginRole });
                setShowLogin(false);
              }}>
                <label className="small-label">FULL NAME</label>
                <input className="login-input" required value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Enter your name" />
                <div style={{ marginTop: 22 }}>
                  <label className="small-label">SELECT YOUR PORTAL</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {(["Admin", "Teacher", "Parent"] as UserRole[]).map(role => (
                      <button type="button" key={role} onClick={() => setLoginRole(role)} className={`role-choice ${loginRole === role ? "selected" : ""}`}>{role}</button>
                    ))}
                  </div>
                </div>
                <button className="gold-button" type="submit" style={{ width: "100%", marginTop: 24 }}>CONTINUE TO PORTAL <ArrowRight size={15} style={{ display: "inline", marginLeft: 8 }} /></button>
              </form>
              <p style={{ color: "#77786f", fontSize: 10, lineHeight: 1.7, textAlign: "center", marginTop: 22 }}>
                Demonstration sign-in. Connect Supabase Authentication and enforce database permissions before using real student records.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pya-app">
      <style>{CSS}</style>
      <div className="portal">
        <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
          <div className="side-brand">
            <div className="brand">
              <div className="brand-mark"><GraduationCap size={25} /></div>
              <div>
                <div className="brand-name" style={{ fontSize: 10 }}>PRESTIGIOUS</div>
                <div className="brand-sub">YOUTH ACADEMY</div>
              </div>
            </div>
          </div>

          <div className="side-label">MAIN WORKSPACE</div>
          {navItems.map(item => (
            <button key={item.id} onClick={() => changePage(item.id)} className={`side-link ${activePage === item.id ? "active" : ""}`}>
              {item.icon}<span>{item.label}</span>
              {activePage === item.id && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
            </button>
          ))}

          <div className="side-label">ACADEMIC YEAR</div>
          <div style={{ margin: "0 8px", padding: 13, background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 8 }}>
            <div style={{ color: "#e4c77d", fontSize: 12, fontWeight: 800 }}>2026 / 2027</div>
            <div style={{ color: "#77786f", fontSize: 10, marginTop: 5 }}>Academic session</div>
          </div>

          <div className="side-bottom">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px 15px" }}>
              <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                <div style={{ color: "#d4b45f", fontSize: 10, marginTop: 3 }}>{user.role} account</div>
              </div>
            </div>
            <button className="side-link" onClick={() => { setUser(null); setActivePage("overview"); }}>
              <LogOut size={17} /> Sign out
            </button>
          </div>
        </aside>

        <div className="portal-main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={19} /></button>
              <div>
                <div className="eyebrow" style={{ fontSize: 8 }}>PRESTIGIOUS YOUTH ACADEMY</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{pageTitle}</div>
              </div>
            </div>
            <div className="topbar-user">
              <button onClick={() => void loadData()} title="Refresh records" style={{ border: "1px solid var(--line)", color: "#dfc579", background: "#ffffff06", padding: 9, borderRadius: 7 }}>
                <RefreshCw size={15} />
              </button>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 800 }}>{user.name}</div>
                <div style={{ fontSize: 9, color: "#d9b45b", marginTop: 3 }}>{user.role}</div>
              </div>
              <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            </div>
          </header>

          <main className="content">
            {(error || notice) && (
              <div className={`notice ${error ? "error" : "success"}`}>
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
                  {error || notice}
                </span>
                <button onClick={() => { setError(""); setNotice(""); }} style={{ background: "none", border: 0, color: "inherit" }}><X size={16} /></button>
              </div>
            )}

            {activePage === "overview" && (
              <>
                <section className="welcome-banner">
                  <div className="eyebrow">EXECUTIVE WORKSPACE</div>
                  <h1 className="serif" style={{ fontSize: "clamp(27px,4vw,39px)", margin: "12px 0 8px" }}>
                    Welcome, <span className="gold-text">{user.name}</span>
                  </h1>
                  <p style={{ color: "#aaa99e", fontSize: 12, lineHeight: 1.8, maxWidth: 570, margin: 0 }}>
                    Your academy at a glance. Manage academic records, review examinations,
                    connect with families and celebrate student activities.
                  </p>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 20 }}>
                    <button className="gold-button" onClick={() => changePage("students")}>MANAGE STUDENTS <ArrowRight size={13} style={{ display: "inline", marginLeft: 6 }} /></button>
                    <button className="outline-button" onClick={() => changePage("exams")}>EXAMINATION BOARD</button>
                  </div>
                </section>

                <div className="eyebrow">ACADEMY AT A GLANCE</div>
                <div className="stats-grid">
                  {statCards.map(item => (
                    <div className="stat-card" key={item.label}>
                      <div className="stat-top"><span>{item.label}</span><span className="stat-icon">{item.icon}</span></div>
                      <div className="stat-value">{loading ? "—" : item.value.toLocaleString()}</div>
                      <div className="stat-note">{item.note}</div>
                    </div>
                  ))}
                </div>

                <div className="panel-grid">
                  <section className="panel">
                    <h3 className="panel-title">Academic Structure</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        ["12", "Grades"],
                        ["60", "Sections"],
                        ["2,400", "Capacity"]
                      ].map(([value, label]) => (
                        <div key={label} style={{ background: "#ffffff06", padding: 15, borderRadius: 8, textAlign: "center" }}>
                          <div className="gold-text" style={{ fontSize: 25, fontWeight: 900 }}>{value}</div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 5 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <p className="muted" style={{ fontSize: 11, lineHeight: 1.8, marginTop: 18 }}>
                      Grades 1–12 · Sections A–E · Maximum 40 students per section.
                    </p>
                  </section>
                  <section className="panel">
                    <h3 className="panel-title">Latest Examination Submissions</h3>
                    {exams.slice(0, 4).map(exam => (
                      <div key={exam.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid #292b25" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{exam.subject} · Grade {exam.grade}</div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{exam.teacher_name}</div>
                        </div>
                        <div className="gold-text" style={{ fontWeight: 900 }}>{exam.ai_score}/100</div>
                      </div>
                    ))}
                    {exams.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No examinations submitted yet.</p>}
                    <button className="outline-button" style={{ marginTop: 15, fontSize: 10 }} onClick={() => changePage("exams")}>OPEN EXAM BOARD →</button>
                  </section>
                </div>

                <section className="panel" style={{ marginTop: 16 }}>
                  <h3 className="panel-title">Assessment Weighting</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 9 }}>
                    {ASSESSMENTS.map(item => (
                      <div key={item.key} style={{ background: "#ffffff06", borderRadius: 7, padding: 12 }}>
                        <div className="muted" style={{ fontSize: 10 }}>{item.label}</div>
                        <div className="gold-text" style={{ fontSize: 22, fontWeight: 900, marginTop: 5 }}>{item.max}%</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activePage === "students" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div className="eyebrow">ACADEMIC RECORDS</div>
                  <h1 className="page-title" style={{ marginTop: 9 }}>Student Management</h1>
                  <p className="page-sub">Registration, class allocation and continuous assessment records.</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-top">Total Students <Users size={17} color="#d9b45b" /></div><div className="stat-value">{students.length}</div><div className="stat-note">Across all grades</div></div>
                  <div className="stat-card"><div className="stat-top">Grade Levels <BookOpen size={17} color="#d9b45b" /></div><div className="stat-value">12</div><div className="stat-note">Grade 1 through 12</div></div>
                  <div className="stat-card"><div className="stat-top">Class Sections <LayoutDashboard size={17} color="#d9b45b" /></div><div className="stat-value">60</div><div className="stat-note">Five sections per grade</div></div>
                  <div className="stat-card"><div className="stat-top">School Capacity <TrendingUp size={17} color="#d9b45b" /></div><div className="stat-value">2,400</div><div className="stat-note">Maximum planned enrollment</div></div>
                </div>

                <section className="panel" style={{ marginBottom: 16 }}>
                  <h3 className="panel-title"><Plus size={17} style={{ display: "inline", marginRight: 8 }} />Register a Student</h3>
                  <form onSubmit={handleAddStudent} className="form-grid">
                    <div><label className="small-label">STUDENT FULL NAME</label><input className="field" required placeholder="Enter full name" value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })} /></div>
                    <div><label className="small-label">AGE</label><input className="field" type="number" min="5" max="25" required value={newStudent.age} onChange={e => setNewStudent({ ...newStudent, age: Number(e.target.value) })} /></div>
                    <div><label className="small-label">GRADE</label><select className="field" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}</select></div>
                    <div><label className="small-label">SECTION</label><select className="field" value={newStudent.section} onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}>{SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}</select></div>
                    <div className="full"><button className="gold-button" disabled={busy}>{busy ? "SAVING..." : "REGISTER STUDENT +"}</button></div>
                  </form>
                </section>

                <section className="panel">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 17 }}>
                    <h3 className="panel-title" style={{ margin: 0 }}>Class Register & Marks</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <select className="field" style={{ width: 115 }} value={selectedGrade} onChange={e => setSelectedGrade(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
                      <input className="field" style={{ width: 160 }} placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                    {SECTIONS.map(s => <button key={s} className={selectedSection === s ? "gold-button" : "outline-button"} style={{ padding: "8px 15px", fontSize: 11 }} onClick={() => setSelectedSection(s)}>{s}</button>)}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Student</th><th>Age</th>{ASSESSMENTS.map(a => <th key={a.key}>{a.label} ({a.max})</th>)}<th>Total /100</th></tr></thead>
                      <tbody>
                        {filteredStudents.map(student => <tr key={student.id}>
                          <td style={{ fontWeight: 800, color: "#f0e8d4" }}>{student.full_name}</td>
                          <td>{student.age}</td>
                          {ASSESSMENTS.map(a => <td key={a.key}>
                            <input className="table-input" type="number" min="0" max={a.max} step="0.5" defaultValue={student[a.key]} onBlur={e => {
                              const value = Number(e.target.value);
                              if (value !== student[a.key]) void handleUpdateMark(student, a.key, value).then(ok => { if (!ok) e.target.value = String(student[a.key]); });
                            }} />
                          </td>)}
                          <td style={{ color: "#e6c978", fontWeight: 900 }}>{getTotalScore(student).toFixed(1)}</td>
                        </tr>)}
                        {!filteredStudents.length && <tr><td colSpan={11} style={{ textAlign: "center", padding: 35, color: "#85867d" }}>No students found in Grade {selectedGrade}, Section {selectedSection}.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activePage === "exams" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div className="eyebrow">TEACHING & LEARNING QUALITY</div>
                  <h1 className="page-title" style={{ marginTop: 9 }}>Examination Review Board</h1>
                  <p className="page-sub">Receive teacher submissions and review preliminary examination quality feedback.</p>
                </div>
                <div className="panel-grid">
                  <form className="panel" onSubmit={handleExamSubmit}>
                    <h3 className="panel-title"><Sparkles size={17} style={{ display: "inline", marginRight: 8 }} />Submit Examination</h3>
                    <div style={{ marginBottom: 13 }}><label className="small-label">TEACHER NAME</label><input className="field" placeholder="Teacher name" value={examForm.teacher_name} onChange={e => setExamForm({ ...examForm, teacher_name: e.target.value })} /></div>
                    <div style={{ marginBottom: 13 }}><label className="small-label">SUBJECT</label><input className="field" required placeholder="e.g. Mathematics" value={examForm.subject} onChange={e => setExamForm({ ...examForm, subject: e.target.value })} /></div>
                    <div style={{ marginBottom: 13 }}><label className="small-label">GRADE</label><select className="field" value={examForm.grade} onChange={e => setExamForm({ ...examForm, grade: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}</select></div>
                    <div style={{ marginBottom: 13 }}><label className="small-label">EXAMINATION TYPE</label><select className="field" value={examForm.exam_type} onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}>{ASSESSMENTS.map(a => <option key={a.key}>{a.label} ({a.max}%)</option>)}</select></div>
                    <div style={{ marginBottom: 15 }}><label className="small-label">QUESTIONS & MARKING SCHEME</label><textarea className="field" rows={9} required placeholder="Paste examination questions and marking scheme..." value={examForm.exam_content} onChange={e => setExamForm({ ...examForm, exam_content: e.target.value })} /></div>
                    <button className="gold-button" disabled={busy} style={{ width: "100%" }}>{busy ? "SUBMITTING..." : "SUBMIT FOR REVIEW"}</button>
                    <p className="muted" style={{ fontSize: 10, lineHeight: 1.7, marginTop: 14 }}>The current score is a preliminary rule-based indicator, not an independent AI or curriculum assessment.</p>
                  </form>
                  <section>
                    <div className="panel" style={{ marginBottom: 14 }}>
                      <div className="eyebrow">SUBMISSION SUMMARY</div>
                      <div className="stat-value">{exams.length}</div>
                      <div className="stat-note">Examinations received</div>
                    </div>
                    {exams.map(exam => <article className="exam-card" key={exam.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div><div style={{ fontWeight: 800, fontSize: 13 }}>{exam.subject} · Grade {exam.grade}</div><div className="muted" style={{ fontSize: 10, marginTop: 5 }}>{exam.teacher_name} · {safeDate(exam.submitted_at)}</div><div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{exam.exam_type}</div></div>
                        <div className="gold-text" style={{ fontSize: 20, fontWeight: 900 }}>{exam.ai_score}<span style={{ fontSize: 10 }}>/100</span></div>
                      </div>
                      <details style={{ marginTop: 15 }}>
                        <summary style={{ color: "#e4c77d", fontSize: 11, cursor: "pointer" }}>View examination and feedback</summary>
                        <p style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.8, color: "#ccc", marginTop: 13 }}>{exam.exam_content}</p>
                        <div style={{ background: "#0b0d0b", borderRadius: 7, padding: 12, color: "#aaa", fontSize: 11, lineHeight: 1.7 }}>{exam.ai_feedback}</div>
                      </details>
                    </article>)}
                    {!exams.length && <div className="panel muted" style={{ fontSize: 12 }}>No examinations have been submitted yet.</div>}
                  </section>
                </div>
              </>
            )}

            {activePage === "chat" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div className="eyebrow">SCHOOL COMMUNITY</div>
                  <h1 className="page-title" style={{ marginTop: 9 }}>Parent & Teacher Communication</h1>
                  <p className="page-sub">A shared space for school-family communication.</p>
                </div>
                <section className="panel">
                  <h3 className="panel-title">Conversation Centre</h3>
                  <div style={{ marginBottom: 16 }}><label className="small-label">STUDENT NAME / REFERENCE</label><input className="field" placeholder="Student name and grade" value={chatStudentRef} onChange={e => setChatStudentRef(e.target.value)} /></div>
                  <div style={{ maxHeight: 470, overflowY: "auto", marginBottom: 18 }}>
                    {messages.map(message => <article className="message-card" key={message.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: "#e4c77d", fontSize: 11, fontWeight: 800 }}>{message.sender_name} · {message.sender_role}</span>
                        <span className="muted" style={{ fontSize: 9 }}>{safeDate(message.created_at)}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 10, marginTop: 7 }}>Student: {message.student_name}</div>
                      <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{message.body}</p>
                    </article>)}
                    {!messages.length && <p className="muted" style={{ fontSize: 12 }}>No messages yet. Start a conversation below.</p>}
                  </div>
                  <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 9 }}>
                    <input className="field" required placeholder="Write a message..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
                    <button className="gold-button" disabled={busy} aria-label="Send message"><Send size={17} /></button>
                  </form>
                </section>
              </>
            )}

            {activePage === "gallery" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div className="eyebrow">CAMPUS LIFE & ACHIEVEMENTS</div>
                  <h1 className="page-title" style={{ marginTop: 9 }}>School Activities Gallery</h1>
                  <p className="page-sub">Capture and share the moments that make academy life special.</p>
                </div>
                <form className="panel" onSubmit={handleAddGalleryItem} style={{ marginBottom: 20 }}>
                  <h3 className="panel-title">Add a Gallery Item</h3>
                  <div className="form-grid">
                    <div><label className="small-label">ACTIVITY TITLE</label><input className="field" required placeholder="e.g. Annual Science Fair" value={galleryForm.title} onChange={e => setGalleryForm({ ...galleryForm, title: e.target.value })} /></div>
                    <div><label className="small-label">CATEGORY</label><input className="field" placeholder="e.g. Science Fair" value={galleryForm.category} onChange={e => setGalleryForm({ ...galleryForm, category: e.target.value })} /></div>
                    <div className="full"><label className="small-label">DIRECT IMAGE URL</label><input className="field" type="url" required placeholder="https://..." value={galleryForm.image_url} onChange={e => setGalleryForm({ ...galleryForm, image_url: e.target.value })} /></div>
                    <div className="full"><button className="gold-button" disabled={busy}>{busy ? "SAVING..." : "ADD TO GALLERY +"}</button></div>
                  </div>
                </form>
                <div className="gallery-grid">
                  {gallery.map(item => <article className="gallery-card" key={item.id}>
                    <img src={item.image_url} alt={item.title} onError={e => { e.currentTarget.style.opacity = "0.15"; }} />
                    <div className="gallery-caption">
                      <div className="eyebrow" style={{ fontSize: 8 }}>{item.category}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, marginTop: 7 }}>{item.title}</div>
                    </div>
                  </article>)}
                </div>
                {!gallery.length && <div className="panel muted" style={{ fontSize: 12, marginTop: 15 }}>No gallery entries yet. Add an image URL above to publish an activity.</div>}
              </>
            )}

            {loading && <div className="panel" style={{ marginTop: 18, textAlign: "center", color: "#d9b45b", fontSize: 12 }}>Loading academy records...</div>}
            <footer style={{ borderTop: "1px solid var(--line)", marginTop: 35, padding: "22px 0 8px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#686a62", fontSize: 9, letterSpacing: 1 }}>
              <span>PRESTIGIOUS YOUTH ACADEMY</span>
              <span>EXCELLENCE · DISCIPLINE · LEADERSHIP</span>
              <span>2026 / 2027</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
