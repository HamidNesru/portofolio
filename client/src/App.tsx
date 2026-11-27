
import React, { useEffect, useMemo, useState } from "react";
import {
  import {
  GraduationCap,
  Users,
  FileCheck2,
  MessageSquare,
  Image as ImageIcon,
  LogOut,
  Plus,
  Sparkles,
  Send,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import { supabase, hasSupabase } from "./supabase";

type UserRole = "Admin" | "Teacher" | "Parent";
type Page = "students" | "exams" | "chat" | "gallery";

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
  { key: "final_exam", label: "Final Exam", max: 40 },
] as const;

const EMPTY_STUDENT = {
  full_name: "",
  grade: 9,
  section: "A",
  age: 15,
};

const EMPTY_EXAM = {
  teacher_name: "",
  subject: "",
  grade: 9,
  exam_type: "Final Exam (40%)",
  exam_content: "",
};

function getTotalScore(student: StudentRecord): number {
  return ASSESSMENTS.reduce(
    (total, assessment) =>
      total + (Number(student[assessment.key]) || 0),
    0
  );
}

// This is a preliminary rule-based assessment, NOT a real AI model.
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

  score = Math.min(score, 95);

  return {
    score,
    feedback:
      `Preliminary assessment for Grade ${grade} ${subject}. ` +
      `Word count: ${words}. ` +
      `Analytical questions: ${analytical ? "Detected" : "Not detected"}. ` +
      `Numbering: ${numbered ? "Detected" : "Not detected"}. ` +
      `Mark allocation: ${marks ? "Detected" : "Not detected"}. ` +
      "A qualified teacher should verify curriculum alignment, accuracy, difficulty and marking fairness.",
  };
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

export default function App() {
  const [user, setUser] = useState<{
    name: string;
    role: UserRole;
  } | null>(null);

  const [loginName, setLoginName] = useState("Director Solomon");
  const [loginRole, setLoginRole] = useState<UserRole>("Admin");

  const [activePage, setActivePage] = useState<Page>("students");
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
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    category: "Science Fair",
    image_url: "",
  });

  const notify = (message: string) => {
    setNotice(message);
    setError("");
  };

  const reportError = (message: string) => {
    setError(message);
    setNotice("");
  };

  const loadData = async () => {
    if (!hasSupabase || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        supabase.from("students").select("*").order("full_name"),
        supabase.from("exams").select("*").order("submitted_at", { ascending: false }),
        supabase.from("messages").select("*").order("created_at"),
        supabase.from("gallery").select("*").order("created_at", { ascending: false }),
      ]);

      const labels = ["Students", "Exams", "Messages", "Gallery"];

      for (let i = 0; i < results.length; i++) {
        if (results[i].error) {
          console.error(labels[i], results[i].error);
        }
      }

      if (results[0].data) setStudents(results[0].data as StudentRecord[]);
      if (results[1].data) setExams(results[1].data as ExamSubmission[]);
      if (results[2].data) setMessages(results[2].data as ChatMessage[]);
      if (results[3].data) setGallery(results[3].data as GalleryItem[]);
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Unable to load school records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(
      student =>
        student.grade === selectedGrade &&
        student.section === selectedSection &&
        student.full_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [students, selectedGrade, selectedSection, search]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStudent.full_name.trim()) {
      reportError("Please enter the student's full name.");
      return;
    }

    const count = students.filter(
      s => s.grade === Number(newStudent.grade) &&
           s.section === newStudent.section
    ).length;

    if (count >= 40) {
      reportError("This section already contains 40 students.");
      return;
    }

    const record = {
      full_name: newStudent.full_name.trim(),
      grade: Number(newStudent.grade),
      section: newStudent.section,
      age: Number(newStudent.age),
      ws1: 0,
      test1: 0,
      ws2: 0,
      test2: 0,
      ws3: 0,
      mid_exam: 0,
      ws4: 0,
      final_exam: 0,
    };

    setBusy(true);

    try {
      if (!supabase || !hasSupabase) {
        throw new Error("Supabase is not configured. Student was not saved.");
      }

      const { data, error: dbError } = await supabase
        .from("students")
        .insert([record])
        .select()
        .single();

      if (dbError) throw dbError;

      setStudents(prev => [...prev, data as StudentRecord]);
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

  const handleUpdateMark = async (
    student: StudentRecord,
    key: typeof ASSESSMENTS[number]["key"],
    value: number
  ) => {
    const assessment = ASSESSMENTS.find(item => item.key === key);
    if (!assessment || !Number.isFinite(value) || value < 0 || value > assessment.max) {
      reportError(`Enter a mark between 0 and ${assessment?.max ?? 0}.`);
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return;
    }

    const { error: dbError } = await supabase
      .from("students")
      .update({ [key]: value })
      .eq("id", student.id);

    if (dbError) {
      reportError(dbError.message);
      return;
    }

    setStudents(prev =>
      prev.map(s => s.id === student.id ? { ...s, [key]: value } : s)
    );
    notify("Student mark updated.");
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examForm.subject.trim() || !examForm.exam_content.trim()) {
      reportError("Enter the subject and examination questions.");
      return;
    }

    const evaluation = evaluateExamQuality(
      examForm.subject,
      Number(examForm.grade),
      examForm.exam_content
    );

    const submission = {
      teacher_name: examForm.teacher_name.trim() || user?.name || "Teacher",
      subject: examForm.subject.trim(),
      grade: Number(examForm.grade),
      exam_type: examForm.exam_type,
      exam_content: examForm.exam_content.trim(),
      ai_score: evaluation.score,
      ai_feedback: evaluation.feedback,
      submitted_at: new Date().toISOString(),
    };

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured. Exam was not saved.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: dbError } = await supabase
        .from("exams")
        .insert([submission])
        .select()
        .single();

      if (dbError) throw dbError;

      setExams(prev => [data as ExamSubmission, ...prev]);
      setExamForm({ ...EMPTY_EXAM, teacher_name: user?.name || "" });
      notify("Examination submitted successfully.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Exam submission failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatInput.trim() || !chatStudentRef.trim()) {
      reportError("Enter a student reference and message.");
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return;
    }

    const record = {
      sender_role: user?.role || "Parent",
      sender_name: user?.name || "User",
      student_name: chatStudentRef.trim(),
      body: chatInput.trim(),
      created_at: new Date().toISOString(),
    };

    setBusy(true);

    try {
      const { data, error: dbError } = await supabase
        .from("messages")
        .insert([record])
        .select()
        .single();

      if (dbError) throw dbError;

      setMessages(prev => [...prev, data as ChatMessage]);
      setChatInput("");
      notify("Message sent successfully.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!galleryForm.title.trim() || !galleryForm.image_url.trim()) {
      reportError("Enter an event title and a direct image URL.");
      return;
    }

    if (!/^https?:\/\/.+/i.test(galleryForm.image_url.trim())) {
      reportError("Enter a valid image URL.");
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return;
    }

    const record = {
      title: galleryForm.title.trim(),
      category: galleryForm.category.trim(),
      image_url: galleryForm.image_url.trim(),
    };

    setBusy(true);

    try {
      const { data, error: dbError } = await supabase
        .from("gallery")
        .insert([record])
        .select()
        .single();

      if (dbError) throw dbError;

      setGallery(prev => [data as GalleryItem, ...prev]);
      setGalleryForm({ title: "", category: "Science Fair", image_url: "" });
      notify("Gallery item added.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Gallery upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "students", label: "Students & Marks", icon: <Users size={16} /> },
    { id: "exams", label: "Exam Review", icon: <FileCheck2 size={16} /> },
    { id: "chat", label: "Parent-Teacher", icon: <MessageSquare size={16} /> },
    { id: "gallery", label: "Gallery", icon: <ImageIcon size={16} /> },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111] border border-[#D4AF37]/40 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6218] text-black flex items-center justify-center">
              <GraduationCap size={34} />
            </div>
            <h1 className="text-xl font-bold text-[#D4AF37]">
              PRESTIGIOUS YOUTH ACADEMY
            </h1>
            <p className="text-xs text-gray-400">School Management Portal</p>
          </div>

          <form onSubmit={e => {
            e.preventDefault();
            if (!loginName.trim()) return;
            setUser({ name: loginName.trim(), role: loginRole });
          }} className="space-y-4">
            <input
              required
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-sm"
            />

            <div className="grid grid-cols-3 gap-2">
              {(["Admin", "Teacher", "Parent"] as UserRole[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setLoginRole(role)}
                  className={`rounded-lg p-2 text-xs font-bold border ${
                    loginRole === role
                      ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                      : "border-gray-700 text-gray-400"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <button className="w-full bg-[#D4AF37] text-black rounded-xl p-3 font-bold">
              Enter {loginRole} Portal
            </button>
          </form>

          <p className="text-[10px] text-center text-gray-500">
            Demonstration interface only. Configure Supabase Authentication before using this system with real student data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-gray-100">
      <header className="bg-[#111] border-b border-[#D4AF37]/30 px-5 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-[#D4AF37]" size={30} />
          <div>
            <h1 className="text-sm font-bold text-[#D4AF37]">
              PRESTIGIOUS YOUTH ACADEMY
            </h1>
            <p className="text-xs text-gray-400">{user.name} • {user.role}</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold ${
                activePage === item.id
                  ? "bg-[#D4AF37] text-black"
                  : "bg-[#1A1A1A] text-gray-300"
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}

          <button
            onClick={() => setUser(null)}
            className="px-3 py-2 rounded-lg bg-red-950/40 text-red-400 text-xs flex items-center gap-2"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        {(error || notice) && (
          <div className={`p-3 rounded-xl flex items-center justify-between text-sm ${
            error ? "bg-red-950/40 text-red-300" : "bg-green-950/30 text-green-300"
          }`}>
            <span className="flex items-center gap-2">
              {error ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
              {error || notice}
            </span>
            <button onClick={() => { setError(""); setNotice(""); }}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              {activePage === "students" ? "Student Academic Management" :
               activePage === "exams" ? "Examination Review Board" :
               activePage === "chat" ? "Parent & Teacher Communication" :
               "School Activities Gallery"}
            </h2>
            <p className="text-xs text-gray-500">Academic Year • 2026/2027</p>
          </div>
          <button onClick={() => void loadData()} disabled={loading}
            className="text-xs text-[#D4AF37] flex items-center gap-2">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {loading && (
          <p className="text-center text-[#D4AF37] py-4">Loading school records...</p>
        )}

        {!loading && activePage === "students" && (
          <section className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Total Students", students.length],
                ["Grades", 12],
                ["Sections", 60],
                ["Capacity", 2400],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#111] border border-[#D4AF37]/20 rounded-xl p-4">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-xl font-bold text-[#D4AF37]">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-[#D4AF37] flex gap-2 items-center">
                <Plus size={17} /> Register Student
              </h3>

              <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input required placeholder="Full name" value={newStudent.full_name}
                  onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs" />

                <select value={newStudent.grade}
                  onChange={e => setNewStudent({ ...newStudent, grade: Number(e.target.value) })}
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(g =>
                    <option key={g} value={g}>Grade {g}</option>
                  )}
                </select>

                <select value={newStudent.section}
                  onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs">
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>

                <input type="number" min={5} max={25} required value={newStudent.age}
                  onChange={e => setNewStudent({ ...newStudent, age: Number(e.target.value) })}
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs" />

                <button disabled={busy} className="bg-[#D4AF37] text-black rounded-lg p-2 font-bold text-xs">
                  {busy ? "Saving..." : "Register Student"}
                </button>
              </form>
            </div>

            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <select value={selectedGrade} onChange={e => setSelectedGrade(Number(e.target.value))}
                    className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g =>
                      <option key={g} value={g}>Grade {g}</option>
                    )}
                  </select>

                  {SECTIONS.map(s => (
                    <button key={s} onClick={() => setSelectedSection(s)}
                      className={`px-3 py-2 rounded-lg text-xs ${
                        selectedSection === s ? "bg-[#D4AF37] text-black" : "bg-[#1A1A1A]"
                      }`}>{s}</button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input placeholder="Search student" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-[#1A1A1A] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[1050px]">
                  <thead className="text-[#D4AF37] bg-[#1A1A1A]">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Age</th>
                      {ASSESSMENTS.map(a => <th key={a.key} className="p-3">{a.label} ({a.max})</th>)}
                      <th className="p-3">Total /100</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td className="p-3 font-bold">{student.full_name}</td>
                        <td className="p-3">{student.age}</td>
                        {ASSESSMENTS.map(a => (
                          <td key={a.key} className="p-2">
                            <input type="number" min="0" max={a.max} step="0.5"
                              defaultValue={student[a.key]}
                              onBlur={e => {
                                const value = Number(e.target.value);
                                if (value !== student[a.key]) {
                                  void handleUpdateMark(student, a.key, value);
                                }
                              }}
                              className="w-14 bg-[#1A1A1A] border border-gray-700 rounded p-1 text-center"
                            />
                          </td>
                        ))}
                        <td className="p-3 font-bold text-[#D4AF37]">
                          {getTotalScore(student).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={11} className="p-6 text-center text-gray-500">
                        No students found in this section.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {!loading && activePage === "exams" && (
          <section className="grid lg:grid-cols-2 gap-5">
            <form onSubmit={handleExamSubmit}
              className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-[#D4AF37] flex items-center gap-2">
                <Sparkles size={18} /> Submit Examination
              </h3>

              <input placeholder="Teacher name" value={examForm.teacher_name}
                onChange={e => setExamForm({ ...examForm, teacher_name: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <input required placeholder="Subject" value={examForm.subject}
                onChange={e => setExamForm({ ...examForm, subject: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <select value={examForm.grade}
                onChange={e => setExamForm({ ...examForm, grade: Number(e.target.value) })}
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g =>
                  <option key={g} value={g}>Grade {g}</option>
                )}
              </select>

              <select value={examForm.exam_type}
                onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs">
                <option>Worksheet 1 (5%)</option>
                <option>Test 1 (10%)</option>
                <option>Worksheet 2 (5%)</option>
                <option>Test 2 (10%)</option>
                <option>Worksheet 3 (5%)</option>
                <option>Mid Exam (20%)</option>
                <option>Worksheet 4 (5%)</option>
                <option>Final Exam (40%)</option>
              </select>

              <textarea required rows={9} placeholder="Paste examination questions and marking scheme..."
                value={examForm.exam_content}
                onChange={e => setExamForm({ ...examForm, exam_content: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <button disabled={busy}
                className="w-full bg-[#D4AF37] text-black font-bold rounded-lg p-3 text-xs">
                {busy ? "Submitting..." : "Submit for Quality Review"}
              </button>
              <p className="text-[10px] text-gray-500">
                Current evaluation is preliminary rule-based feedback, not an external AI assessment.
              </p>
            </form>

            <div className="space-y-4">
              <h3 className="font-bold text-[#D4AF37]">Submitted Examinations ({exams.length})</h3>
              {exams.map(exam => (
                <article key={exam.id} className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm">{exam.subject} • Grade {exam.grade}</h4>
                      <p className="text-xs text-gray-500">{exam.teacher_name} • {safeDate(exam.submitted_at)}</p>
                    </div>
                    <span className="text-[#D4AF37] font-bold text-sm">{exam.ai_score}/100</span>
                  </div>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{exam.exam_content}</p>
                  <div className="bg-[#1A1A1A] rounded-lg p-3 text-xs text-gray-300">
                    {exam.ai_feedback}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!loading && activePage === "chat" && (
          <section className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[#D4AF37]">Parent–Teacher Communication</h3>

            <input placeholder="Student name and grade" value={chatStudentRef}
              onChange={e => setChatStudentRef(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {messages.map(message => (
                <div key={message.id} className="bg-[#1A1A1A] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      {message.sender_name} ({message.sender_role})
                    </span>
                    <span className="text-[10px] text-gray-500">{safeDate(message.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Student: {message.student_name}</p>
                  <p className="text-sm">{message.body}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />
              <button disabled={busy} className="bg-[#D4AF37] text-black rounded-lg px-4">
                <Send size={17} />
              </button>
            </form>
          </section>
        )}

        {!loading && activePage === "gallery" && (
          <section className="space-y-5">
            <form onSubmit={handleAddGalleryItem}
              className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 grid sm:grid-cols-2 gap-3">
              <input required placeholder="Event title" value={galleryForm.title}
                onChange={e => setGalleryForm({ ...galleryForm, title: e.target.value })}
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <input placeholder="Category" value={galleryForm.category}
                onChange={e => setGalleryForm({ ...galleryForm, category: e.target.value })}
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <input required type="url" placeholder="Direct image URL" value={galleryForm.image_url}
                onChange={e => setGalleryForm({ ...galleryForm, image_url: e.target.value })}
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs" />

              <button disabled={busy} className="bg-[#D4AF37] text-black rounded-lg p-3 font-bold text-xs">
                Add Gallery Item
              </button>
            </form>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map(item => (
                <article key={item.id} className="bg-[#111] border border-[#D4AF37]/30 rounded-xl overflow-hidden">
                  <img src={item.image_url} alt={item.title}
                    className="w-full h-48 object-cover bg-[#1A1A1A]"
                    onError={e => {
                      e.currentTarget.style.display = "none";
                    }} />
                  <div className="p-4 space-y-2">
                    <p className="text-[10px] uppercase text-[#D4AF37]">{item.category}</p>
                    <h3 className="font-bold text-sm">{item.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#D4AF37]/20 p-4 text-center text-[10px] text-gray-600">
        PRESTIGIOUS YOUTH ACADEMY • SCHOOL MANAGEMENT SYSTEM
      </footer>
    </div>
  );
}
