import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function xmlToText(xml: string) {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

async function extractDocx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) throw new Error("The Word file does not contain a readable document.xml.");
  const xml = await documentXml.async("text");
  const text = xmlToText(xml);
  if (!text) throw new Error("No readable text was found in the Word document.");
  return text;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Sign in is required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ??
      JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return reply({ error: "Supabase function credentials are not configured." }, 500);
    }
    if (!geminiKey) return reply({ error: "GEMINI_API_KEY is not configured in Edge Function secrets." }, 500);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Your session is invalid or expired." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("school_profiles")
      .select("id,role,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
      return reply({ error: "Only an active school administrator can request or view AI exam evaluations." }, 403);
    }

    const body = await req.json();
    const submissionId = String(body?.submission_id || "");
    if (!submissionId) return reply({ error: "submission_id is required." }, 400);

    const { data: submission, error: submissionError } = await admin
      .from("pya_exam_submissions")
      .select("id,teacher_id,grade,subject_id,title,instructions,file_path,file_name,mime_type,status")
      .eq("id", submissionId)
      .single();
if (submissionError || !submission) return reply({ error: "Exam submission was not found." }, 404);

    const { data: subject } = await admin
      .from("school_subjects")
      .select("name,code,grade")
      .eq("id", submission.subject_id)
      .maybeSingle();

    const { data: standards, error: standardsError } = await admin
      .from("pya_exam_standards")
      .select("title,grade,standard_text,marking_guidelines,created_at")
      .eq("grade", submission.grade)
      .eq("subject_id", submission.subject_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (standardsError) throw standardsError;
    if (!standards?.length) {
      return reply({ error: `No active administrator-approved standards exist for Grade ${submission.grade} ${subject?.name || "subject"}. Add the standard and marking guidance first.` }, 409);
    }

    const { data: fileData, error: downloadError } = await admin.storage
      .from("pya-academic-files")
      .download(submission.file_path);
    if (downloadError || !fileData) throw new Error("Could not retrieve the submitted examination file.");

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    let parts: Array<Record<string, unknown>>;
    let extractedText = "";

    if (submission.mime_type === "application/pdf" || submission.file_name.toLowerCase().endsWith(".pdf")) {
      parts = [
        {
          inline_data: {
            mime_type: "application/pdf",
            data: base64(fileBytes),
          },
        },
      ];
    } else if (
      submission.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      submission.file_name.toLowerCase().endsWith(".docx")
    ) {
      extractedText = await extractDocx(fileBytes);
      parts = [{ text: `EXAMINATION DOCUMENT TEXT:\n${extractedText}` }];
    } else {
      return reply({ error: "Unsupported file. Upload a PDF or modern Word .docx file." }, 415);
    }
const standardsText = standards.map((s, i) =>
      `STANDARD ${i + 1}: ${s.title}\n${s.standard_text}\nMARKING GUIDELINES:\n${s.marking_guidelines || "Not supplied."}`
    ).join("\n\n");

    const prompt = `
You are an expert school examination quality-assurance reviewer. Evaluate the attached examination paper against the administrator-provided standards below.

SUBMISSION:
Title: ${submission.title}
Grade: ${submission.grade}
Subject: ${subject?.name || "Unknown"}
Teacher instructions/context: ${submission.instructions || "None supplied"}

ADMINISTRATOR-APPROVED STANDARDS (use these as the primary authority):
${standardsText}

Review these dimensions:
1. Grade-level and subject appropriateness.
2. Alignment with the supplied standards and curriculum expectations. Do not invent curriculum requirements that are not in the supplied standards.
3. Spelling, grammar, punctuation and language clarity.
4. Ambiguous, duplicated, incomplete, misleading or factually questionable questions.
5. Question coverage, cognitive demand, variety and balance.
6. Marks: whether marks are shown, add up consistently, and are proportionate to question difficulty. Calculate totals when possible; show the calculation.
7. Instructions, numbering, layout, readability and exam structure.
8. Missing diagrams, data, answer choices or information needed to answer a question.

Return ONLY valid JSON, no markdown fences, with this schema:
{
  "summary": "short overall assessment",
  "overall_score": 0,
  "decision": "meets_standard | needs_revision | not_ready",
  "checks": [{"criterion":"...", "status":"pass | warning | fail", "finding":"..."}],
  "issues": [{"severity":"critical | major | minor", "category":"...", "location":"question/page if identifiable", "problem":"...", "suggested_correction":"..."}],
  "strengths": ["..."],
  "marks_check": {"stated_total": "value or not identifiable", "calculated_total": "value or not identifiable", "consistent": true, "details":"..."},
  "recommended_actions": ["..."],
  "limitations": ["..."]
}
Scoring: 90-100 meets_standard; 70-89 needs_revision; below 70 not_ready. Do not give a high score if a critical issue exists. Be precise and cite question numbers or page references when visible. If a detail cannot be verified, say so. This is an advisory AI review, not a final academic decision. A human administrator must review it.
`;

    parts.unshift({ text: prompt });
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.15, responseMimeType: "application/json" },
        }),
      },
    );
const aiPayload = await aiResponse.json();
    if (!aiResponse.ok) {
      const message = aiPayload?.error?.message || `Gemini request failed (${aiResponse.status}).`;
      return reply({ error: message }, 502);
    }

    const generated = aiPayload?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("")
      .trim();
    if (!generated) throw new Error("The AI returned an empty evaluation.");

    let report: Record<string, unknown>;
    try {
      report = JSON.parse(generated);
    } catch {
      throw new Error("The AI response was not valid JSON. Please run the evaluation again.");
    }

    const decision = ["meets_standard", "needs_revision", "not_ready"].includes(String(report.decision))
      ? String(report.decision)
      : "needs_revision";
    const score = Number(report.overall_score);
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;

    const { error: saveReviewError } = await admin.from("pya_exam_reviews").upsert({
      submission_id: submission.id,
      evaluated_by: "Gemini AI",
      model_name: model,
      overall_score: safeScore,
      decision,
      report,
      raw_text_excerpt: extractedText ? extractedText.slice(0, 12000) : null,
    }, { onConflict: "submission_id" });

    if (saveReviewError) throw saveReviewError;

    const { error: updateError } = await admin
      .from("pya_exam_submissions")
      .update({ status: "evaluated" })
      .eq("id", submission.id);
    if (updateError) throw updateError;

    return reply({ success: true, submission_id: submission.id, model, report });
  } catch (error) {
    console.error("evaluate-exam error:", error);
    return reply({ error: error instanceof Error ? error.message : "Exam evaluation failed." }, 500);
  }
});

