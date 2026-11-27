
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  X,
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

type AssessmentKey = (typeof ASSESSMENTS)[number]["key"];

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

const EMPTY_GALLERY = {
  title: "",
  category: "Science Fair",
  image_url: "",
};

function getTotalScore(student: StudentRecord): number {
  return ASSESSMENTS.reduce((total, assessment) => {
    return total + (Number(student[assessment.key]) || 0);
  }, 0);
}

function evaluateExamQuality(
  subject: string,
  grade: number,
  content: string
) {
  const text = content.trim();
  const words = text ? text.split(/\s+/).length : 0;

  const analytical =
    /(analyze|compare|evaluate|calculate|explain|derive|justify|discuss)/i.test(
      text
    );

  const numbered =
    /(\b1[.)]|\b2[.)]|\bQ1|\bQuestion\s*1)/i.test(text);

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

function safeDate(value?: string) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function validImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function App() {
  const [user, setUser] = useState<{
    name: string;
    role: UserRole;
  } | null>(null);

  const [loginName, setLoginName] = useState("Director Solomon");
  const [loginRole, setLoginRole] = useState<UserRole>("Admin");
const [showLogin, setShowLogin] = useState(false);
const [heroIndex, setHeroIndex] = useState(0);

const heroImages = [
  "/academy-hero-1.jpg",
  "/academy-hero-2.jpg",
  "/academy-hero-3.jpg",
];

useEffect(() => {
  const timer = window.setInterval(() => {
    setHeroIndex(current => (current + 1) % heroImages.length);
  }, 6000);

  return () => window.clearInterval(timer);
}, []);
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
  const [galleryForm, setGalleryForm] = useState(EMPTY_GALLERY);

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

    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        supabase.from("students").select("*").order("full_name"),
        supabase
          .from("exams")
          .select("*")
          .order("submitted_at", { ascending: false }),
        supabase.from("messages").select("*").order("created_at"),
        supabase
          .from("gallery")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      const labels = ["Students", "Exams", "Messages", "Gallery"];
      const errors: string[] = [];

   results.forEach((result: { error: { message: string } | null }, index: number) => {
        if (result.error) {
          console.error(`${labels[index]} loading error:`, result.error);
          errors.push(`${labels[index]}: ${result.error.message}`);
        }
      });

      if (results[0].data) {
        setStudents(results[0].data as StudentRecord[]);
      }

      if (results[1].data) {
        setExams(results[1].data as ExamSubmission[]);
      }

      if (results[2].data) {
        setMessages(results[2].data as ChatMessage[]);
      }

      if (results[3].data) {
        setGallery(results[3].data as GalleryItem[]);
      }

      if (errors.length > 0) {
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter(
      student =>
        Number(student.grade) === selectedGrade &&
        student.section === selectedSection &&
        String(student.full_name || "").toLowerCase().includes(query)
    );
  }, [students, selectedGrade, selectedSection, search]);

  const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newStudent.full_name.trim()) {
      reportError("Please enter the student's full name.");
      return;
    }

    if (
      !Number.isInteger(Number(newStudent.grade)) ||
      Number(newStudent.grade) < 1 ||
      Number(newStudent.grade) > 12
    ) {
      reportError("Select a valid grade from 1 to 12.");
      return;
    }

    if (!SECTIONS.includes(newStudent.section)) {
      reportError("Select a valid section.");
      return;
    }

    if (
      !Number.isFinite(Number(newStudent.age)) ||
      Number(newStudent.age) < 5 ||
      Number(newStudent.age) > 25
    ) {
      reportError("Student age must be between 5 and 25.");
      return;
    }

    const count = students.filter(
      student =>
        Number(student.grade) === Number(newStudent.grade) &&
        student.section === newStudent.section
    ).length;

    if (count >= 40) {
      reportError("This section already contains 40 students.");
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured. Student was not saved.");
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
      const { data, error: dbError } = await supabase
        .from("students")
        .insert([record])
        .select()
        .single();

      if (dbError) throw dbError;

      setStudents(previous => [...previous, data as StudentRecord]);
      setSelectedGrade(record.grade);
      setSelectedSection(record.section);

      setNewStudent({
        ...EMPTY_STUDENT,
        grade: record.grade,
        section: record.section,
      });

      notify("Student successfully registered.");
    } catch (err) {
      reportError(
        err instanceof Error ? err.message : "Student registration failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateMark = async (
    student: StudentRecord,
    key: AssessmentKey,
    value: number
  ) => {
    const assessment = ASSESSMENTS.find(item => item.key === key);

    if (
      !assessment ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > assessment.max
    ) {
      reportError(`Enter a mark between 0 and ${assessment?.max ?? 0}.`);
      return false;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return false;
    }

    try {
      const { error: dbError } = await supabase
        .from("students")
        .update({ [key]: value })
        .eq("id", student.id);

      if (dbError) throw dbError;

      setStudents(previous =>
        previous.map(item =>
          item.id === student.id ? { ...item, [key]: value } : item
        )
      );

      notify(`${assessment.label} mark updated.`);
      return true;
    } catch (err) {
      reportError(
        err instanceof Error ? err.message : "Unable to update student mark."
      );
      return false;
    }
  };

  const handleExamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!examForm.subject.trim() || !examForm.exam_content.trim()) {
      reportError("Enter the subject and examination questions.");
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured. Exam was not saved.");
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

    setBusy(true);

    try {
      const { data, error: dbError } = await supabase
        .from("exams")
        .insert([submission])
        .select()
        .single();

      if (dbError) throw dbError;

      setExams(previous => [data as ExamSubmission, ...previous]);

      setExamForm({
        ...EMPTY_EXAM,
        teacher_name: user?.name || "",
      });

      notify("Examination submitted successfully.");
    } catch (err) {
      reportError(
        err instanceof Error ? err.message : "Exam submission failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
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

      setMessages(previous => [...previous, data as ChatMessage]);
      setChatInput("");
      notify("Message sent successfully.");
    } catch (err) {
      reportError(
        err instanceof Error ? err.message : "Message could not be sent."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddGalleryItem = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!galleryForm.title.trim() || !galleryForm.image_url.trim()) {
      reportError("Enter an event title and a direct image URL.");
      return;
    }

    if (!validImageUrl(galleryForm.image_url.trim())) {
      reportError("Enter a valid HTTP or HTTPS image URL.");
      return;
    }

    if (!supabase || !hasSupabase) {
      reportError("Supabase is not configured.");
      return;
    }

    const record = {
      title: galleryForm.title.trim(),
      category: galleryForm.category.trim() || "School Activity",
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

      setGallery(previous => [data as GalleryItem, ...previous]);
      setGalleryForm(EMPTY_GALLERY);
      notify("Gallery item added.");
    } catch (err) {
      reportError(
        err instanceof Error ? err.message : "Gallery upload failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const navItems: {
    id: Page;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "students",
      label: "Students & Marks",
      icon: <Users size={16} />,
    },
    {
      id: "exams",
      label: "Exam Review",
      icon: <FileCheck2 size={16} />,
    },
    {
      id: "chat",
      label: "Parent-Teacher",
      icon: <MessageSquare size={16} />,
    },
    {
      id: "gallery",
      label: "Gallery",
      icon: <ImageIcon size={16} />,
    },
  ];

 
if (!user) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="fixed top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#F5D77A] to-[#946B20] p-2 rounded-xl text-black">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="font-bold text-[#E7C66C] tracking-wider text-sm">
                PRESTIGIOUS YOUTH ACADEMY
              </h1>
              <p className="text-[9px] text-gray-400 tracking-[3px]">
                EXCELLENCE • DISCIPLINE • LEADERSHIP
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogin(true)}
            className="bg-gradient-to-r from-[#D4AF37] to-[#A77A22] text-black font-bold text-xs px-6 py-3 rounded-full hover:scale-105 transition"
          >
            PORTAL LOGIN →
          </button>
        </div>
      </header>

      <section className="relative min-h-[750px] h-screen max-h-[950px] flex items-center overflow-hidden">
        {heroImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ${
              heroIndex === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/30" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-[#D4AF37]/50 rounded-full px-4 py-2 mb-7 bg-black/40">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <span className="text-[#E6C66F] text-[10px] tracking-[3px] font-bold">
                SHAPING TOMORROW'S LEADERS
              </span>
            </div>

            <p className="text-[#D4AF37] text-sm tracking-[5px] mb-5">
              WELCOME TO
            </p>

            <h2 className="text-5xl md:text-7xl font-black leading-tight">
              PRESTIGIOUS
              <span className="block text-[#D4AF37]">
                YOUTH ACADEMY
              </span>
            </h2>

            <div className="w-24 h-1 bg-[#D4AF37] my-7" />

            <p className="text-gray-200 text-lg md:text-xl max-w-xl leading-relaxed">
              Building knowledge, developing character and inspiring
              the next generation of exceptional leaders.
            </p>

            <div className="flex flex-wrap gap-4 mt-9">
              <button
                onClick={() => setShowLogin(true)}
                className="bg-gradient-to-r from-[#E7C66C] to-[#A77A22] text-black px-8 py-4 rounded-lg font-black text-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition"
              >
                ENTER SCHOOL PORTAL →
              </button>

              <a
                href="#about"
                className="border border-white/40 text-white px-8 py-4 rounded-lg font-bold text-sm hover:bg-white/10 transition"
              >
                DISCOVER OUR SCHOOL
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-6 right-6 z-10 flex justify-between items-end">
          <div className="text-[10px] tracking-[4px] text-[#D4AF37]">
            PRESTIGIOUS YOUTH ACADEMY
          </div>

          <div className="flex gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setHeroIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  heroIndex === index
                    ? "w-10 bg-[#D4AF37]"
                    : "w-5 bg-white/40"
                }`}
                aria-label={`Show hero image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#0D0D0D] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#D4AF37] tracking-[4px] text-xs mb-4">
            OUR COMMITMENT
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Education Beyond the Classroom
          </h2>
          <p className="text-gray-400 max-w-2xl leading-7 mb-12">
            We believe education is about more than academic results.
            It is about developing confident, responsible and creative
            individuals prepared for the future.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <GraduationCap size={30} />,
                title: "Academic Excellence",
                description: "A commitment to meaningful learning and achievement."
              },
              {
                icon: <Users size={30} />,
                title: "Student Development",
                description: "Supporting students as they discover their potential."
              },
              {
                icon: <Sparkles size={30} />,
                title: "A Brighter Future",
                description: "Encouraging creativity, leadership and ambition."
              }
            ].map(item => (
              <div
                key={item.title}
                className="bg-[#151515] border border-[#D4AF37]/20 rounded-2xl p-7 hover:border-[#D4AF37] transition"
              >
                <div className="text-[#D4AF37] mb-5">{item.icon}</div>
                <h3 className="font-bold text-lg mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-6">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-black border-t border-[#D4AF37]/20 py-8 text-center">
        <p className="text-[#D4AF37] text-xs tracking-[3px] font-bold">
          PRESTIGIOUS YOUTH ACADEMY
        </p>
        <p className="text-gray-600 text-[10px] mt-3">
          EXCELLENCE • DISCIPLINE • LEADERSHIP
        </p>
      </footer>

      {showLogin && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#111] border border-[#D4AF37]/50 rounded-2xl p-8 shadow-2xl">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-white"
              aria-label="Close login"
            >
              <X size={22} />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#E7C66C] to-[#946B20] text-black flex items-center justify-center mb-4">
                <GraduationCap size={35} />
              </div>
              <h2 className="text-xl font-black text-[#D4AF37]">
                SCHOOL PORTAL
              </h2>
              <p className="text-xs text-gray-500 mt-2">
                Demonstration access
              </p>
            </div>

            <form
              onSubmit={event => {
                event.preventDefault();
                if (!loginName.trim()) return;

                setUser({
                  name: loginName.trim(),
                  role: loginRole
                });
                setShowLogin(false);
              }}
              className="space-y-5"
            >
              <label className="block">
                <span className="text-xs text-gray-400 mb-2 block">
                  YOUR NAME
                </span>
                <input
                  required
                  value={loginName}
                  onChange={event => setLoginName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-[#1C1C1C] border border-gray-700 focus:border-[#D4AF37] rounded-lg p-4 text-sm outline-none"
                />
              </label>

              <div>
                <span className="text-xs text-gray-400 mb-3 block">
                  SELECT YOUR PORTAL
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["Admin", "Teacher", "Parent"] as UserRole[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setLoginRole(role)}
                      className={`rounded-lg py-3 text-xs font-bold border transition ${
                        loginRole === role
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : "bg-[#1A1A1A] text-gray-400 border-gray-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#E7C66C] to-[#A77A22] text-black rounded-lg p-4 font-black text-sm"
              >
                ENTER {loginRole.toUpperCase()} PORTAL
              </button>
            </form>

            <p className="text-[10px] text-center text-gray-600 mt-6 leading-5">
              Demonstration login only. Configure Supabase Authentication
              and role-based access before using real student records.
            </p>
          </div>
        </div>
      )}
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

            <p className="text-xs text-gray-400">
              {user.name} • {user.role}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold ${
                activePage === item.id
                  ? "bg-[#D4AF37] text-black"
                  : "bg-[#1A1A1A] text-gray-300"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setUser(null)}
            className="px-3 py-2 rounded-lg bg-red-950/40 text-red-400 text-xs flex items-center gap-2"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        {(error || notice) && (
          <div
            className={`p-3 rounded-xl flex items-center justify-between text-sm ${
              error
                ? "bg-red-950/40 text-red-300"
                : "bg-green-950/30 text-green-300"
            }`}
          >
            <span className="flex items-center gap-2">
              {error ? (
                <AlertCircle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              {error || notice}
            </span>

            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
              }}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              {activePage === "students"
                ? "Student Academic Management"
                : activePage === "exams"
                  ? "Examination Review Board"
                  : activePage === "chat"
                    ? "Parent & Teacher Communication"
                    : "School Activities Gallery"}
            </h2>

            <p className="text-xs text-gray-500">
              Academic Year • 2026/2027
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs text-[#D4AF37] flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {loading && (
          <p className="text-center text-[#D4AF37] py-4">
            Loading school records...
          </p>
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
                <div
                  key={String(label)}
                  className="bg-[#111] border border-[#D4AF37]/20 rounded-xl p-4"
                >
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-xl font-bold text-[#D4AF37]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-[#D4AF37] flex gap-2 items-center">
                <Plus size={17} />
                Register Student
              </h3>

              <form
                onSubmit={handleAddStudent}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                <input
                  required
                  placeholder="Full name"
                  value={newStudent.full_name}
                  onChange={event =>
                    setNewStudent({
                      ...newStudent,
                      full_name: event.target.value,
                    })
                  }
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs"
                />

                <select
                  value={newStudent.grade}
                  onChange={event =>
                    setNewStudent({
                      ...newStudent,
                      grade: Number(event.target.value),
                    })
                  }
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs"
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    grade => (
                      <option key={grade} value={grade}>
                        Grade {grade}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={newStudent.section}
                  onChange={event =>
                    setNewStudent({
                      ...newStudent,
                      section: event.target.value,
                    })
                  }
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs"
                >
                  {SECTIONS.map(section => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={5}
                  max={25}
                  required
                  value={newStudent.age}
                  onChange={event =>
                    setNewStudent({
                      ...newStudent,
                      age: Number(event.target.value),
                    })
                  }
                  placeholder="Age"
                  className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs"
                />

                <button
                  type="submit"
                  disabled={busy}
                  className="bg-[#D4AF37] text-black rounded-lg p-2 font-bold text-xs disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Register Student"}
                </button>
              </form>
            </div>

            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedGrade}
                    onChange={event =>
                      setSelectedGrade(Number(event.target.value))
                    }
                    className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-2 text-xs"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      grade => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      )
                    )}
                  </select>

                  {SECTIONS.map(section => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setSelectedSection(section)}
                      className={`px-3 py-2 rounded-lg text-xs ${
                        selectedSection === section
                          ? "bg-[#D4AF37] text-black"
                          : "bg-[#1A1A1A]"
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-2.5 text-gray-500"
                  />

                  <input
                    placeholder="Search student"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="bg-[#1A1A1A] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[1050px]">
                  <thead className="text-[#D4AF37] bg-[#1A1A1A]">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Age</th>

                      {ASSESSMENTS.map(assessment => (
                        <th key={assessment.key} className="p-3">
                          {assessment.label} ({assessment.max})
                        </th>
                      ))}

                      <th className="p-3">Total /100</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-800">
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td className="p-3 font-bold">
                          {student.full_name}
                        </td>

                        <td className="p-3">{student.age}</td>

                        {ASSESSMENTS.map(assessment => (
                          <td key={assessment.key} className="p-2">
                            <input
                              type="number"
                              min="0"
                              max={assessment.max}
                              step="0.5"
                              defaultValue={student[assessment.key]}
                              onBlur={event => {
                                const value = Number(event.target.value);

                                if (value !== student[assessment.key]) {
                                  void handleUpdateMark(
                                    student,
                                    assessment.key,
                                    value
                                  ).then(success => {
                                    if (!success) {
                                      event.target.value = String(
                                        student[assessment.key]
                                      );
                                    }
                                  });
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
                      <tr>
                        <td
                          colSpan={11}
                          className="p-6 text-center text-gray-500"
                        >
                          No students found in this section.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {!loading && activePage === "exams" && (
          <section className="grid lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleExamSubmit}
              className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4"
            >
              <h3 className="font-bold text-[#D4AF37] flex items-center gap-2">
                <Sparkles size={18} />
                Submit Examination
              </h3>

              <input
                placeholder="Teacher name"
                value={examForm.teacher_name}
                onChange={event =>
                  setExamForm({
                    ...examForm,
                    teacher_name: event.target.value,
                  })
                }
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <input
                required
                placeholder="Subject"
                value={examForm.subject}
                onChange={event =>
                  setExamForm({
                    ...examForm,
                    subject: event.target.value,
                  })
                }
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <select
                value={examForm.grade}
                onChange={event =>
                  setExamForm({
                    ...examForm,
                    grade: Number(event.target.value),
                  })
                }
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  grade => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  )
                )}
              </select>

              <select
                value={examForm.exam_type}
                onChange={event =>
                  setExamForm({
                    ...examForm,
                    exam_type: event.target.value,
                  })
                }
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              >
                <option>Worksheet 1 (5%)</option>
                <option>Test 1 (10%)</option>
                <option>Worksheet 2 (5%)</option>
                <option>Test 2 (10%)</option>
                <option>Worksheet 3 (5%)</option>
                <option>Mid Exam (20%)</option>
                <option>Worksheet 4 (5%)</option>
                <option>Final Exam (40%)</option>
              </select>

              <textarea
                required
                rows={9}
                placeholder="Paste examination questions and marking scheme..."
                value={examForm.exam_content}
                onChange={event =>
                  setExamForm({
                    ...examForm,
                    exam_content: event.target.value,
                  })
                }
                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-[#D4AF37] text-black font-bold rounded-lg p-3 text-xs disabled:opacity-50"
              >
                {busy ? "Submitting..." : "Submit for Quality Review"}
              </button>

              <p className="text-[10px] text-gray-500">
                Current evaluation is preliminary rule-based feedback, not an
                external AI assessment.
              </p>
            </form>

            <div className="space-y-4">
              <h3 className="font-bold text-[#D4AF37]">
                Submitted Examinations ({exams.length})
              </h3>

              {exams.map(exam => (
                <article
                  key={exam.id}
                  className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-3"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm">
                        {exam.subject} • Grade {exam.grade}
                      </h4>

                      <p className="text-xs text-gray-500">
                        {exam.teacher_name} • {safeDate(exam.submitted_at)}
                      </p>

                      <p className="text-xs text-gray-500">
                        {exam.exam_type}
                      </p>
                    </div>

                    <span className="text-[#D4AF37] font-bold text-sm">
                      {exam.ai_score}/100
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 whitespace-pre-wrap">
                    {exam.exam_content}
                  </p>

                  <div className="bg-[#1A1A1A] rounded-lg p-3 text-xs text-gray-300">
                    {exam.ai_feedback}
                  </div>
                </article>
              ))}

              {exams.length === 0 && (
                <p className="text-sm text-gray-500">
                  No examinations have been submitted yet.
                </p>
              )}
            </div>
          </section>
        )}

        {!loading && activePage === "chat" && (
          <section className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-[#D4AF37]">
              Parent–Teacher Communication
            </h3>

            <input
              placeholder="Student name and grade"
              value={chatStudentRef}
              onChange={event => setChatStudentRef(event.target.value)}
              className="w-full bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
            />

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {messages.map(message => (
                <div
                  key={message.id}
                  className="bg-[#1A1A1A] rounded-xl p-4 space-y-2"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      {message.sender_name} ({message.sender_role})
                    </span>

                    <span className="text-[10px] text-gray-500">
                      {safeDate(message.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Student: {message.student_name}
                  </p>

                  <p className="text-sm whitespace-pre-wrap">
                    {message.body}
                  </p>
                </div>
              ))}

              {messages.length === 0 && (
                <p className="text-sm text-gray-500">
                  No messages yet.
                </p>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={chatInput}
                onChange={event => setChatInput(event.target.value)}
                placeholder="Write a message..."
                className="flex-1 min-w-0 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <button
                type="submit"
                disabled={busy}
                className="bg-[#D4AF37] text-black rounded-lg px-4 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </form>
          </section>
        )}

        {!loading && activePage === "gallery" && (
          <section className="space-y-5">
            <form
              onSubmit={handleAddGalleryItem}
              className="bg-[#111] border border-[#D4AF37]/30 rounded-xl p-5 grid sm:grid-cols-2 gap-3"
            >
              <input
                required
                placeholder="Event title"
                value={galleryForm.title}
                onChange={event =>
                  setGalleryForm({
                    ...galleryForm,
                    title: event.target.value,
                  })
                }
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <input
                placeholder="Category"
                value={galleryForm.category}
                onChange={event =>
                  setGalleryForm({
                    ...galleryForm,
                    category: event.target.value,
                  })
                }
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <input
                required
                type="url"
                placeholder="Direct image URL"
                value={galleryForm.image_url}
                onChange={event =>
                  setGalleryForm({
                    ...galleryForm,
                    image_url: event.target.value,
                  })
                }
                className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-3 text-xs"
              />

              <button
                type="submit"
                disabled={busy}
                className="bg-[#D4AF37] text-black rounded-lg p-3 font-bold text-xs disabled:opacity-50"
              >
                {busy ? "Saving..." : "Add Gallery Item"}
              </button>
            </form>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map(item => (
                <article
                  key={item.id}
                  className="bg-[#111] border border-[#D4AF37]/30 rounded-xl overflow-hidden"
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover bg-[#1A1A1A]"
                    onError={event => {
                      event.currentTarget.style.display = "none";
                    }}
                  />

                  <div className="p-4 space-y-2">
                    <p className="text-[10px] uppercase text-[#D4AF37]">
                      {item.category}
                    </p>

                    <h3 className="font-bold text-sm">{item.title}</h3>
                  </div>
                </article>
              ))}

              {gallery.length === 0 && (
                <p className="text-sm text-gray-500">
                  No school activities have been added yet.
                </p>
              )}
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
