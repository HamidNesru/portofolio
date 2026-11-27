
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Users, BookOpen, FileCheck2, MessageSquare,
  Image as ImageIcon, LogOut, Plus, Sparkles, Send,
  RefreshCw, AlertCircle, CheckCircle2, X, LayoutDashboard,
  Menu, ArrowRight, Award, ChevronRight,
  Trophy, Microscope, TrendingUp
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
