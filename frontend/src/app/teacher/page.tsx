"use client";

import React, { useEffect, useState, type FormEvent, Fragment } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Clock,
  ArrowRight,
  RefreshCw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  BookOpen,
  Trash2,
  ExternalLink,
  Edit,
  Lock,
  LogOut,
  Save,
  X,
  KeyRound,
  UserCheck,
} from "lucide-react";
import MathRenderer from "@/components/MathRenderer";
import StudentManager from "@/components/teacher/StudentManager";

// ساختار هر سوال در پاسخ‌نامه
interface QuestionDetail {
  questionId?: string;
  questionText: string;
  selectedOption: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  weight?: number;
}

// ساختار داده سابمیشن برای پنل
interface SubmissionItem {
  id: number | string;
  documentId?: string;
  studentName: string;
  studentClass: string;
  nationalCode: string;
  score: number;
  timeSpentSeconds: number;
  createdAt: string;
  quizTitle: string;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  details: QuestionDetail[];
}

// ساختار هر سوال داخل آزمون
// correctOption همان ایندکس صفر-بیس گزینه صحیح است (همان چیزی که در استراپی ذخیره می‌شود)
interface QuestionItem {
  documentId?: string;
  questionText: string;
  options: string[];
  correctOption: number;
  score?: number;
}

// ساختار آزمون
interface QuizItem {
  id: number | string;
  documentId?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  slug?: string;
  questions?: QuestionItem[];
}

// کاربر معلمِ لاگین‌شده
interface TeacherUser {
  username?: string;
  email?: string;
}

// پاسخ صحیح: منبع اصلی correctOption (صفر-بیس) است و داده‌های قدیمی
// که فقط correctAnswer (یک-بیس) دارند هم پشتیبانی می‌شوند.
const resolveCorrectOption = (question: Record<string, unknown>): number => {
  const modern = Number(question?.correctOption);
  if (Number.isInteger(modern) && modern >= 0) return modern;

  const legacy = Number(question?.correctAnswer);
  if (!Number.isFinite(legacy)) return 0;
  return legacy >= 1 ? legacy - 1 : legacy;
};

// پیام خطای استاندارد از یک مقدار catch شده
const getErrorMessage = (err: unknown, fallback = "خطای نامشخص") =>
  err instanceof Error ? err.message : fallback;

// همه‌ی درخواست‌های مرورگر از مسیر نسبی /api/strapi به بک‌اند پروکسی می‌شوند؛
// بنابراین نه به localhost وابسته‌ایم و نه به CORS.
const STRAPI_BASE_URL = "/api/strapi";

// نشست دبیر در کوکی‌های httpOnly سمت سرور نگه‌داری می‌شود؛ مرورگر
// هیچ توکنی در localStorage ندارد و همه‌ی درخواست‌ها از پروکسی رد می‌شوند.
const TEACHER_SESSION_ENDPOINT = "/api/teacher/session";
const TEACHER_LOGIN_ENDPOINT = "/api/teacher/login";
const TEACHER_LOGOUT_ENDPOINT = "/api/teacher/logout";

export default function TeacherDashboard() {
  // وضعیت احراز هویت
  const [authenticated, setAuthenticated] = useState(false);
  const [teacherUser, setTeacherUser] = useState<TeacherUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // فیلدهای فرم ورود
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // تب فعال
  const [activeTab, setActiveTab] = useState<
    "results" | "students" | "quizzes" | "create"
  >("results");

  // تعداد دانش‌آموزان (از کامپوننت مدیریت دانش‌آموز برای برچسب تب)
  const [studentCount, setStudentCount] = useState(0);

  // داده‌های عمومی
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(
    null
  );
  const [actionId, setActionId] = useState<string | null>(null);

  // فرم ساخت آزمون جدید
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [slug, setSlug] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      questionText: "",
      options: ["", "", "", ""],
      correctOption: 0,
      score: 10,
    },
  ]);
  const [creating, setCreating] = useState(false);
  // آزمونی که ساخته شده ولی بعضی سؤال‌هایش ثبت نشده (برای تلاش مجدد)
  const [pendingQuiz, setPendingQuiz] = useState<{
    quizDocumentId: string;
    quizTitle: string;
    remainingQuestions: QuestionItem[];
  } | null>(null);

  // مودال ویرایش کارنامه
  const [editingSub, setEditingSub] = useState<SubmissionItem | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubClass, setEditSubClass] = useState("");
  const [editSubNationalCode, setEditSubNationalCode] = useState("");
  const [editSubScore, setEditSubScore] = useState(0);

  // مودال ویرایش آزمون
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState("");
  const [editQuizDescription, setEditQuizDescription] = useState("");
  const [editQuizDuration, setEditQuizDuration] = useState(15);
  const [editQuizSlug, setEditQuizSlug] = useState("");

  // مودال ویرایش سوال خاص داخل یک آزمون
  const [editingQuestionQuiz, setEditingQuestionQuiz] =
    useState<QuizItem | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(
    null
  );
  const [questionDraft, setQuestionDraft] = useState<QuestionItem>({
    questionText: "",
    options: ["", "", "", ""],
    correctOption: 0,
    score: 10,
  });

  // ۱. بازیابی نشست از کوکی httpOnly (منبع حقیقت سمت سرور است)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(TEACHER_SESSION_ENDPOINT, { cache: "no-store" });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setTeacherUser(data?.user ?? null);
          setAuthenticated(true);
        }
      } catch {
        // نشست در دسترس نیست؛ فرم ورود نمایش داده می‌شود
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // واکشی داده‌ها بعد از داشتن توکن — بعد از تعریف fetchData قرار دارد
  // عملیات لاگین
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      // احراز هویت سمت سرور انجام می‌شود و توکن در کوکی httpOnly می‌نشیند
      const res = await fetch(TEACHER_LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
            "نام کاربری یا رمز عبور اشتباه است (یا دسترسی فعال نیست)."
        );
      }

      setTeacherUser(data.user ?? null);
      setAuthenticated(true);
      setLoginPassword("");
    } catch (err) {
      setLoginError(getErrorMessage(err, "خطا در احراز هویت با سرور"));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setTeacherUser(null);
    setSubmissions([]);
    setQuizzes([]);
    void fetch(TEACHER_LOGOUT_ENDPOINT, { method: "POST" }).catch(() => {});
  };

  // پیام خطای دقیق برگشتی از استراپی را استخراج می‌کند
  const extractStrapiError = async (res: Response, fallback: string) => {
    let message = fallback;
    try {
      const json = await res.json();
      if (json?.error?.message) message = json.error.message;
    } catch {
      // بدنهٔ JSON نداشت؛ پیام پیش‌فرض می‌ماند
    }
    return `${message} (کد ${res.status})`;
  };

  // درخواست احراز هویت‌شده؛ توکن در کوکی است و پروکسی آن را تزریق می‌کند
  const authedFetch = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${STRAPI_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (res.status === 401) {
      handleLogout();
      throw new Error("نشست کاری منقضی شده است. لطفاً دوباره وارد شوید.");
    }
    return res;
  };

  // ثبت سؤال‌ها در Collection Type جدای «question» با رابطه به آزمون؛
  // سؤال‌های ناموفق برگردانده می‌شوند تا وضعیت ناقص قابل بازیابی باشد
  const createQuestionsForQuiz = async (
    quizDocumentId: string,
    quizQuestions: QuestionItem[]
  ): Promise<QuestionItem[]> => {
    const failed: QuestionItem[] = [];
    for (const q of quizQuestions) {
      try {
        const res = await authedFetch(`/api/questions?status=published`, {
          method: "POST",
          body: JSON.stringify({
            data: {
              questionText: q.questionText,
              options: q.options,
              // پاسخ صحیح به‌صورت ایندکس صفر-بیس ذخیره می‌شود
              correctOption: q.correctOption,
              score: Number(q.score) > 0 ? Number(q.score) : 1,
              quiz: quizDocumentId,
            },
          }),
        });
        if (!res.ok) {
          failed.push(q);
          console.error(
            "خطای ثبت سؤال:",
            await extractStrapiError(res, "نامشخص")
          );
        }
      } catch {
        failed.push(q);
      }
    }
    return failed;
  };

  // باز/بسته کردن ردیف جزئیات کارنامه در جدول
  const toggleRow = (id: string | number) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // دریافت همه سابمیشن‌ها و آزمون‌ها
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subRes, quizRes] = await Promise.all([
        fetch(`${STRAPI_BASE_URL}/api/submissions?populate=*`, {
          cache: "no-store",
        }),
        fetch(`${STRAPI_BASE_URL}/api/quizzes?populate=*`, {
          cache: "no-store",
        }),
      ]);

      if (!subRes.ok || !quizRes.ok) {
        if (subRes.status === 401 || quizRes.status === 401) {
          handleLogout();
          throw new Error("نشست کاری شما منقضی شده است. لطفاً دوباره وارد شوید.");
        }
        const failed = !subRes.ok ? subRes : quizRes;
        throw new Error(
          await extractStrapiError(
            failed,
            "خطا در برقراری ارتباط با سرور استراپی."
          )
        );
      }

      const subJson = await subRes.json();
      const quizJson = await quizRes.json();

      // نرمال‌سازی سابمیشن‌ها
      const rawSubList = Array.isArray(subJson.data) ? subJson.data : [];
      // نرمال‌سازی رکورد خام استراپی (سازگار با خروجی v4 و v5)
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const mappedSubmissions: SubmissionItem[] = rawSubList.map((item: any) => {
        const data = item.attributes ? item.attributes : item;
        const answersObj = data.answers || {};

        let quizTitle = "آزمون نامشخص";
        if (data.quiz) {
          quizTitle =
            data.quiz.title ||
            data.quiz.data?.attributes?.title ||
            "آزمون فیزیک";
        }

        const score = typeof data.score === "number" ? data.score : 0;
        const percentage =
          typeof answersObj.percentage === "number"
            ? answersObj.percentage
            : Math.min(100, Math.round(score));

        let details: QuestionDetail[] = [];
        if (Array.isArray(answersObj.details)) {
          details = answersObj.details;
        } else if (Array.isArray(answersObj)) {
          details = answersObj;
        }

        return {
          id: item.documentId || item.id,
          documentId: item.documentId,
          studentName: data.studentName || "ناشناس",
          studentClass: data.studentClass || "-",
          nationalCode: data.nationalCode || "-",
          score,
          percentage,
          correctCount: answersObj.correctCount ?? 0,
          totalQuestions: answersObj.totalQuestions ?? 0,
          timeSpentSeconds: data.timeSpentSeconds || 0,
          createdAt: data.createdAt,
          quizTitle,
          details,
        };
      });

      // نرمال‌سازی آزمون‌ها
      const rawQuizList = Array.isArray(quizJson.data) ? quizJson.data : [];
      const mappedQuizzes: QuizItem[] = rawQuizList.map((item: any) => {
        const data = item.attributes ? item.attributes : item;
        return {
          id: item.documentId || item.id,
          documentId: item.documentId,
          title: data.title || "بدون عنوان",
          description: data.description || "",
          durationMinutes: data.durationMinutes || 15,
          slug: data.slug || "",
          questions: Array.isArray(data.questions)
            ? data.questions.map((q: any) => ({
                documentId: q.documentId || q.id,
                questionText: q.questionText || "",
                options: Array.isArray(q.options) ? q.options : [],
                correctOption: resolveCorrectOption(q),
                score: q.score ?? 10,
              }))
            : [],
        };
      });

      setSubmissions(mappedSubmissions);
      setQuizzes(mappedQuizzes);
    } catch (err) {
      console.error(err);
      if (err instanceof TypeError) {
        setError(
          "ارتباط با سرور آزمون برقرار نشد (خطای شبکه). بررسی کنید سرویس بک‌اند در حال اجرا باشد."
        );
      } else {
        setError(getErrorMessage(err, "خطا در واکشی داده‌ها از استراپی"));
      }
    } finally {
      setLoading(false);
    }
  };

  // واکشی داده‌ها بعد از تأیید نشست
  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData در هر رندر بازسازی می‌شود و فراخوانی مجدد آن خطا ایجاد می‌کند
  }, [authenticated]);

  // ==================== عملیات سابمیشن (کارنامه) ====================
  const handleDeleteSubmission = async (sub: SubmissionItem) => {
    const id = String(sub.documentId || sub.id);
    if (!window.confirm(`کارنامهٔ «${sub.studentName}» حذف شود؟`)) return;

    try {
      setActionId(`del-sub-${id}`);
      const res = await authedFetch(
        `/api/submissions/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "حذف کارنامه با خطا مواجه شد.")
        );
      }
      setSubmissions((prev) =>
        prev.filter((item) => String(item.documentId || item.id) !== id)
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const openEditSubmissionModal = (sub: SubmissionItem) => {
    setEditingSub(sub);
    setEditSubName(sub.studentName);
    setEditSubClass(sub.studentClass);
    setEditSubNationalCode(sub.nationalCode);
    setEditSubScore(sub.score);
  };

  const handleSaveSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    const id = String(editingSub.documentId || editingSub.id);

    try {
      setActionId(`save-sub-${id}`);
      const res = await authedFetch(
        `/api/submissions/${encodeURIComponent(id)}?status=published`,
        {
          method: "PUT",
          body: JSON.stringify({
            data: {
              studentName: editSubName,
              studentClass: editSubClass,
              nationalCode: editSubNationalCode,
              score: Number(editSubScore),
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "خطا در به‌روزرسانی کارنامه.")
        );
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          String(item.documentId || item.id) === id
            ? {
                ...item,
                studentName: editSubName,
                studentClass: editSubClass,
                nationalCode: editSubNationalCode,
                score: Number(editSubScore),
              }
            : item
        )
      );

      setEditingSub(null);
      setSuccessMsg("کارنامه با موفقیت به‌روزرسانی شد.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ==================== عملیات آزمون‌ها (Quizzes) ====================
  const handleDeleteQuiz = async (quiz: QuizItem) => {
    const id = String(quiz.documentId || quiz.id);
    if (!window.confirm(`آزمون «${quiz.title}» حذف شود؟`)) return;

    try {
      setActionId(`del-quiz-${id}`);
      const res = await authedFetch(
        `/api/quizzes/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "حذف آزمون با خطا مواجه شد.")
        );
      }
      setQuizzes((prev) =>
        prev.filter((item) => String(item.documentId || item.id) !== id)
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const openEditQuizModal = (quiz: QuizItem) => {
    setEditingQuiz(quiz);
    setEditQuizTitle(quiz.title);
    setEditQuizDescription(quiz.description || "");
    setEditQuizDuration(quiz.durationMinutes || 15);
    setEditQuizSlug(quiz.slug || "");
  };

  const handleSaveQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;
    const id = String(editingQuiz.documentId || editingQuiz.id);

    try {
      setActionId(`save-quiz-${id}`);
      const res = await authedFetch(
        `/api/quizzes/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            data: {
              title: editQuizTitle,
              description: editQuizDescription,
              durationMinutes: Number(editQuizDuration),
              slug: editQuizSlug,
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "خطا در ذخیره تغییرات آزمون.")
        );
      }

      setQuizzes((prev) =>
        prev.map((item) =>
          String(item.documentId || item.id) === id
            ? {
                ...item,
                title: editQuizTitle,
                description: editQuizDescription,
                durationMinutes: Number(editQuizDuration),
                slug: editQuizSlug,
              }
            : item
        )
      );

      setEditingQuiz(null);
      setSuccessMsg("مشخصات آزمون به‌روزرسانی شد.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ==================== عملیات سؤالات درون آزمون ====================
  const handleDeleteQuestion = async (quiz: QuizItem, qIndex: number) => {
    const question = (quiz.questions || [])[qIndex];
    if (!question?.documentId) {
      setError("شناسهٔ سؤال یافت نشد؛ امکان حذف نیست.");
      return;
    }
    if (!window.confirm(`سؤال شماره ${qIndex + 1} از آزمون حذف شود؟`)) return;

    try {
      setActionId(`del-q-${question.documentId}`);
      // سؤال یک Collection Type جداست و مستقیماً از /api/questions حذف می‌شود
      const res = await authedFetch(
        `/api/questions/${encodeURIComponent(question.documentId)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "حذف سؤال ناموفق بود.")
        );
      }
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const openEditQuestionModal = (
    quiz: QuizItem,
    qIdx: number,
    question: QuestionItem
  ) => {
    setEditingQuestionQuiz(quiz);
    setEditingQuestionIdx(qIdx);
    setQuestionDraft({
      questionText: question.questionText || "",
      options: question.options ? [...question.options] : ["", "", "", ""],
      correctOption: question.correctOption ?? 0,
      score: question.score ?? 10,
    });
  };

  const handleSaveQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingQuestionQuiz || editingQuestionIdx === null) return;
    const question = (editingQuestionQuiz.questions || [])[
      editingQuestionIdx
    ];
    if (!question?.documentId) {
      setError("شناسهٔ سؤال یافت نشد؛ امکان ذخیره نیست.");
      return;
    }

    try {
      setActionId(`save-q-${question.documentId}`);

      const res = await authedFetch(
        `/api/questions/${encodeURIComponent(question.documentId)}?status=published`,
        {
          method: "PUT",
          body: JSON.stringify({
            data: {
              questionText: questionDraft.questionText,
              options: questionDraft.options,
              correctOption: questionDraft.correctOption,
              score: Number(questionDraft.score) > 0 ? Number(questionDraft.score) : 1,
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          await extractStrapiError(res, "خطا در ذخیره تغییرات سؤال.")
        );
      }

      setEditingQuestionQuiz(null);
      setEditingQuestionIdx(null);
      setSuccessMsg("سؤال با موفقیت به‌روزرسانی شد.");
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  // ==================== ساخت آزمون جدید ====================
  const handleAddQuestionField = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        options: ["", "", "", ""],
        correctOption: 0,
        score: 10,
      },
    ]);
  };

  const handleCreateQuiz = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccessMsg("");

    try {
      // فاز ۱: ایجاد آزمون و انتشار آن
      const res = await authedFetch(`/api/quizzes`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            title,
            description,
            durationMinutes: Number(durationMinutes),
            slug: slug || undefined,
          },
        }),
      });

      if (res.status === 403) {
        throw new Error(
          "دسترسی لازم برای ایجاد آزمون ندارید. نقش Authenticated را در پنل استراپی بررسی کنید."
        );
      }
      if (!res.ok) {
        throw new Error(await extractStrapiError(res, "خطا در ایجاد آزمون در سرور."));
      }

      const quizJson = await res.json();
      const quizDocumentId: string = quizJson?.data?.documentId;
      if (!quizDocumentId) {
        throw new Error("پاسخ سرور فاقد documentId آزمون بود.");
      }

      // فاز ۲: ثبت تک‌تک سؤال‌ها با رابطه به آزمون
      const failedQuestions = await createQuestionsForQuiz(
        quizDocumentId,
        questions
      );

      if (failedQuestions.length > 0) {
        // وضعیت ناقص باید شفاف باشد؛ فرم را پاک نمی‌کنیم تا داده از دست نرود
        setPendingQuiz({
          quizDocumentId,
          quizTitle: title,
          remainingQuestions: failedQuestions,
        });
        setError(
          `آزمون «${title}» ساخته شد اما ثبت ${failedQuestions.length} سؤال ناموفق بود. می‌توانید با دکمه «تلاش مجدد» فقط سؤال‌های باقی‌مانده را ثبت کنید.`
        );
      } else {
        setSuccessMsg("آزمون با موفقیت ایجاد و منتشر شد!");
        setTitle("");
        setDescription("");
        setSlug("");
        setQuestions([
          {
            questionText: "",
            options: ["", "", "", ""],
            correctOption: 0,
            score: 10,
          },
        ]);
        await fetchData();
        setActiveTab("quizzes");
      }
    } catch (err) {
      setError(getErrorMessage(err, "خطا در ثبت آزمون"));
    } finally {
      setCreating(false);
    }
  };

  // تلاش مجدد فقط برای سؤال‌هایی که در مرحلهٔ ساخت آزمون ثبت نشدند
  const handleRetryPendingQuestions = async () => {
    if (!pendingQuiz) return;
    setCreating(true);
    setError(null);

    try {
      const failedQuestions = await createQuestionsForQuiz(
        pendingQuiz.quizDocumentId,
        pendingQuiz.remainingQuestions
      );

      if (failedQuestions.length > 0) {
        setPendingQuiz({
          ...pendingQuiz,
          remainingQuestions: failedQuestions,
        });
        setError(
          `ثبت ${failedQuestions.length} سؤال هنوز ناموفق بود. دوباره تلاش کنید.`
        );
      } else {
        setSuccessMsg(
          `همهٔ سؤال‌های باقی‌ماندهٔ آزمون «${pendingQuiz.quizTitle}» ثبت شدند.`
        );
        setPendingQuiz(null);
        await fetchData();
        setActiveTab("quizzes");
      }
    } catch (err) {
      setError(getErrorMessage(err, "خطا در تکمیل سؤال‌های آزمون"));
    } finally {
      setCreating(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      sub.studentName.toLowerCase().includes(q) ||
      sub.studentClass.toLowerCase().includes(q) ||
      sub.nationalCode.toLowerCase().includes(q) ||
      sub.quizTitle.toLowerCase().includes(q)
    );
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} دقیقه و ${secs} ثانیه`;
    return `${secs} ثانیه`;
  };

  // صفحه لودینگ اولیه احراز هویت
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // اگر توکن نبود => نمایش صفحه لاگین دبیر
  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="card w-full max-w-md p-6 sm:p-8">
          <div className="text-center space-y-3 mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-foreground">
              ورود به پنل دبیران HelliQuiz
            </h1>
            <p className="text-xs text-muted">
              برای دسترسی به سوابق دانش‌آموزان و مدیریت آزمون‌ها وارد شوید
            </p>
          </div>

          {loginError && (
            <div className="alert alert-error mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">
                نام کاربری یا ایمیل
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="teacher / teacher@helli.ir"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn btn-primary w-full mt-2"
            >
              {loggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال احراز هویت...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ورود به داشبورد دبیر</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-muted hover:text-indigo-300 transition"
            >
              بازگشت به صفحه اصلی آزمون‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // داشبورد اصلی معلم پس از احراز هویت
  return (
    <main
      className="min-h-screen text-foreground p-4 md:p-8"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* هدر پنل دبیر */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">داشبورد مدیریت دبیر</h1>
                {teacherUser && (
                  <span className="badge">
                    <UserCheck className="w-3 h-3" />
                    {teacherUser.username || teacherUser.email}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                مدیریت کامل کارنامه‌ها، ویرایش و ساخت آزمون‌ها و اصلاح سؤالات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="btn btn-ghost"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>به‌روزرسانی</span>
            </button>

            <button
              onClick={handleLogout}
              className="btn btn-ghost text-rose-300 hover:text-rose-200"
              title="خروج از حساب دبیر"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>

            <Link
              href="/"
              className="btn btn-primary"
            >
              <span>مشاهده سامانه دانش‌آموز</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* تب‌های ناوبری */}
        <div className="flex flex-wrap gap-2 border-b border-hairline pb-4">
          <button
            onClick={() => setActiveTab("results")}
            className={`tab ${activeTab === "results" ? "tab-active" : ""}`}
          >
            <Users className="h-4 w-4" />
            کارنامه دانش‌آموزان ({submissions.length})
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`tab ${activeTab === "students" ? "tab-active" : ""}`}
          >
            <GraduationCap className="h-4 w-4" />
            دانش‌آموزان{studentCount > 0 ? ` (${studentCount})` : ""}
          </button>

          <button
            onClick={() => setActiveTab("quizzes")}
            className={`tab ${activeTab === "quizzes" ? "tab-active" : ""}`}
          >
            <BookOpen className="h-4 w-4" />
            مدیریت آزمون‌ها ({quizzes.length})
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`tab ${activeTab === "create" ? "tab-active" : ""}`}
          >
            <PlusCircle className="h-4 w-4" />
            طراحی آزمون و سوال جدید
          </button>
        </div>

        {error && (
          <div className="alert alert-error justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm text-muted">
              در حال بارگذاری اطلاعات پنل...
            </p>
          </div>
        ) : (
          <>
            {/* ================= تب دانش‌آموزان ================= */}
            {activeTab === "students" && (
              <StudentManager
                onCountChange={setStudentCount}
                onNotice={setSuccessMsg}
              />
            )}

            {/* ================= تب اول: کارنامه‌ها ================= */}
            {activeTab === "results" && (
              <div className="space-y-6">
                {/* خلاصه آمار */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card stat-card">
                    <div className="stat-icon">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="stat-label">
                        کل شرکت‌کنندگان
                      </p>
                      <h3 className="stat-value">
                        {submissions.length} نفر
                      </h3>
                    </div>
                  </div>

                  <div className="card stat-card">
                    <div className="stat-icon stat-icon-success">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="stat-label">
                        میانگین نمرات
                      </p>
                      <h3 className="stat-value">
                        {submissions.length > 0
                          ? Math.round(
                              submissions.reduce(
                                (acc, curr) => acc + curr.percentage,
                                0
                              ) / submissions.length
                            )
                          : 0}
                        %
                      </h3>
                    </div>
                  </div>

                  <div className="card stat-card">
                    <div className="stat-icon stat-icon-warning">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="stat-label">
                        میانگین زمان
                      </p>
                      <h3 className="stat-value">
                        {submissions.length > 0
                          ? formatTime(
                              Math.round(
                                submissions.reduce(
                                  (acc, curr) =>
                                    acc + curr.timeSpentSeconds,
                                  0
                                ) / submissions.length
                              )
                            )
                          : "۰ ثانیه"}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* جستجو */}
                <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="جستجو با نام، کلاس یا کد ملی..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pr-10"
                    />
                  </div>
                  <div className="text-xs text-muted">
                    نمایش <b>{filteredSubmissions.length}</b> نتیجه
                  </div>
                </div>

                {/* جدول کارنامه‌ها */}
                <div className="card overflow-hidden">
                  {filteredSubmissions.length === 0 ? (
                    <div className="py-20 text-center text-muted text-sm">
                      <FileSpreadsheet className="w-12 h-12 text-faint mx-auto mb-2" />
                      هیچ کارنامه‌ای ثبت نشده یا مطابق با جستجو پیدا نشد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead className="text-xs">
                          <tr>
                            <th className="py-3.5 px-4">نام دانش‌آموز</th>
                            <th className="py-3.5 px-4">کلاس</th>
                            <th className="py-3.5 px-4">کد ملی</th>
                            <th className="py-3.5 px-4">آزمون</th>
                            <th className="py-3.5 px-4 text-center">نمره</th>
                            <th className="py-3.5 px-4 text-center">درصد</th>
                            <th className="py-3.5 px-4">زمان ثبت‌شده</th>
                            <th className="py-3.5 px-4 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubmissions.map((sub) => {
                            const isExpanded = expandedRowId === sub.id;
                            const rowId = String(sub.documentId || sub.id);

                            return (
                              <Fragment key={rowId}>
                                <tr
                                  onClick={() => toggleRow(sub.id)}
                                  className="cursor-pointer"
                                >
                                  <td className="py-3.5 px-4 font-bold text-white">
                                    {sub.studentName}
                                  </td>
                                  <td className="py-3.5 px-4 text-xs font-semibold text-indigo-300">
                                    {sub.studentClass}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-xs text-muted">
                                    {sub.nationalCode}
                                  </td>
                                  <td className="py-3.5 px-4 text-xs">
                                    {sub.quizTitle}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold">
                                    {sub.score}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span
                                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        sub.percentage >= 50
                                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                                          : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                                      }`}
                                    >
                                      {sub.percentage}%
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-xs text-muted">
                                    {formatTime(sub.timeSpentSeconds)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div
                                      className="flex items-center justify-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* دکمه ویرایش کارنامه */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEditSubmissionModal(sub)
                                        }
                                        className="icon-btn icon-btn-warning"
                                        title="ویرایش مشخصات دانش‌آموز و نمره"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>

                                      {/* دکمه حذف کارنامه */}
                                      <button
                                        type="button"
                                        disabled={
                                          actionId === `del-sub-${rowId}`
                                        }
                                        onClick={() =>
                                          handleDeleteSubmission(sub)
                                        }
                                        className="icon-btn icon-btn-danger disabled:opacity-50"
                                        title="حذف کارنامه"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => toggleRow(sub.id)}
                                        className="p-1.5 text-muted hover:text-indigo-600"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* بازشونده جزئیات کارنامه */}
                                {isExpanded && (
                                  <tr className="bg-surface/40">
                                    <td colSpan={8} className="p-4 sm:p-6">
                                      <div className="bg-surface-raised rounded-2xl border border-hairline p-5 space-y-4">
                                        <h4 className="font-bold text-sm border-b border-hairline pb-2">
                                          تحلیل دقیق پاسخ‌نامه {sub.studentName}
                                        </h4>
                                        {sub.details.length === 0 ? (
                                          <p className="text-xs text-muted py-2">
                                            جزئیات تفکیکی برای این آزمون ثبت
                                            نشده است.
                                          </p>
                                        ) : (
                                          <div className="space-y-3">
                                            {sub.details.map((item, qIdx) => (
                                              <div
                                                key={qIdx}
                                                className={`p-3 rounded-xl border ${
                                                  item.isCorrect
                                                    ? "border-emerald-500/30 bg-emerald-500/10"
                                                    : "border-rose-500/30 bg-rose-500/10"
                                                }`}
                                              >
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                  <span>سؤال {qIdx + 1}</span>
                                                  <span
                                                    className={
                                                      item.isCorrect
                                                        ? "text-emerald-400"
                                                        : "text-rose-400"
                                                    }
                                                  >
                                                    {item.isCorrect
                                                      ? "صحیح"
                                                      : "نادرست"}
                                                  </span>
                                                </div>
                                                <div className="text-xs leading-6 mb-2">
                                                  <MathRenderer
                                                    content={
                                                      item.questionText || ""
                                                    }
                                                  />
                                                </div>
                                                <div className="text-xs flex gap-4 text-muted">
                                                  <span>
                                                    پاسخ دانش‌آموز:{" "}
                                                    <b>
                                                      {item.selectedOption !=
                                                      null
                                                        ? Number(
                                                            item.selectedOption
                                                          ) + 1
                                                        : "بی‌پاسخ"}
                                                    </b>
                                                  </span>
                                                  <span>
                                                    گزینه صحیح:{" "}
                                                    <b className="text-emerald-400">
                                                      {Number(
                                                        item.correctAnswer
                                                      ) + 1}
                                                    </b>
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= تب دوم: مدیریت آزمون‌ها ================= */}
            {activeTab === "quizzes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">آزمون‌های موجود در سیستم</h2>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-700 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>آزمون جدید</span>
                  </button>
                </div>

                {quizzes.length === 0 && (
                  <div className="card flex flex-col items-center gap-3 p-10 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                      <PlusCircle className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-white">هنوز آزمونی ساخته نشده است</p>
                    <p className="max-w-sm text-xs leading-6 text-muted">
                      از دکمهٔ «آزمون جدید» یک آزمون بسازید؛ آزمون‌هایی که در پنل استراپی
                      هم می‌سازید همین‌جا نمایش داده می‌شوند.
                    </p>
                  </div>
                )}

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((quiz) => {
                    const quizId = String(quiz.documentId || quiz.id);
                    const qList = quiz.questions || [];

                    return (
                      <div
                        key={quizId}
                        className="card p-6 flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold">{quiz.title}</h3>
                            <button
                              onClick={() => openEditQuizModal(quiz)}
                              className="text-amber-300 hover:bg-amber-500/10 p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold"
                              title="ویرایش مشخصات کلی آزمون"
                            >
                              <Edit className="w-4 h-4" />
                              <span>ویرایش</span>
                            </button>
                          </div>

                          <p className="text-xs text-muted line-clamp-2">
                            {quiz.description || "بدون توضیحات"}
                          </p>

                          <div className="flex items-center gap-2 text-xs font-medium text-muted">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{quiz.durationMinutes} دقیقه</span>
                            <span>•</span>
                            <span>{qList.length} سؤال</span>
                            {quiz.slug && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] bg-background/50 px-1.5 py-0.5 rounded">
                                  {quiz.slug}
                                </span>
                              </>
                            )}
                          </div>

                          {/* لیست سوالات جهت ویرایش درجا یا حذف */}
                          {qList.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-hairline">
                              <p className="text-xs font-bold text-muted">
                                سؤالات آزمون:
                              </p>
                              {qList.map((q, qIdx) => (
                                <div
                                  key={qIdx}
                                  className="flex items-center justify-between gap-2 bg-background/50 p-2.5 rounded-xl text-xs"
                                >
                                  <div className="line-clamp-1 flex-1">
                                    <b>سؤال {qIdx + 1}:</b>{" "}
                                    <MathRenderer content={q.questionText} />
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        openEditQuestionModal(quiz, qIdx, q)
                                      }
                                      className="text-amber-300 hover:bg-amber-500/10 p-1 rounded"
                                      title="ویرایش متن یا گزینه‌های این سؤال"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteQuestion(quiz, qIdx)
                                      }
                                      className="text-rose-300 hover:bg-rose-500/10 p-1 rounded"
                                      title="حذف این سؤال"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-hairline">
                          <Link
                            href={`/quiz/${quizId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:underline"
                          >
                            مشاهده آزمون
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            onClick={() => handleDeleteQuiz(quiz)}
                            disabled={actionId === `del-quiz-${quizId}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>حذف آزمون</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= تب سوم: ساخت آزمون و سوال جدید ================= */}
            {activeTab === "create" && (
              <div className="card max-w-3xl mx-auto p-5 sm:p-8">
                {pendingQuiz && (
                  <div className="alert alert-warning mb-6 flex-col items-start space-y-3">
                    <p className="text-sm font-bold text-amber-300">
                      آزمون «{pendingQuiz.quizTitle}» ساخته شده است، اما{" "}
                      {pendingQuiz.remainingQuestions.length} سؤال آن هنوز ثبت
                      نشده. آزمون را رها نکنید؛ سؤال‌های باقی‌مانده را تکمیل
                      کنید.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRetryPendingQuestions}
                        disabled={creating}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {creating
                          ? "در حال تلاش مجدد..."
                          : "تلاش مجدد ثبت سؤال‌های باقی‌مانده"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingQuiz(null)}
                        className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold"
                      >
                        رها کردن (آزمون بدون این سؤال‌ها می‌ماند)
                      </button>
                    </div>
                  </div>
                )}
                <h2 className="text-xl font-bold mb-6">
                  ساخت آزمون و سؤالات جدید
                </h2>
                <form onSubmit={handleCreateQuiz} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">
                        عنوان آزمون
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: آزمون جامع فیزیک نهم"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">
                        اسلاگ (URL دوستانه)
                      </label>
                      <input
                        type="text"
                        placeholder="physics-exam-2"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">
                        مدت زمان (دقیقه)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(e) =>
                          setDurationMinutes(Number(e.target.value))
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">
                        توضیحات کوتاه آزمون
                      </label>
                      <input
                        type="text"
                        placeholder="توضیحات برای راهنمایی دانش‌آموز..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <hr className="border-hairline my-6" />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">سؤالات آزمون</h3>
                      <button
                        type="button"
                        onClick={handleAddQuestionField}
                        className="btn btn-ghost btn-sm"
                      >
                        + افزودن سؤال جدید
                      </button>
                    </div>

                    {questions.map((q, qIndex) => (
                      <div
                        key={qIndex}
                        className="rounded-xl border border-hairline bg-background/50 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">
                            سؤال شماره {qIndex + 1}
                          </span>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setQuestions(
                                  questions.filter((_, i) => i !== qIndex)
                                )
                              }
                              className="text-xs text-rose-300 hover:underline"
                            >
                              حذف سؤال
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1">
                            متن سؤال (پشتیبانی از KaTeX مانند $x = \frac{1}{2}$)
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={q.questionText}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[qIndex].questionText = e.target.value;
                              setQuestions(updated);
                            }}
                            className="input"
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correctOption === optIdx}
                                onChange={() => {
                                  const updated = [...questions];
                                  updated[qIndex].correctOption = optIdx;
                                  setQuestions(updated);
                                }}
                                title="انتخاب به عنوان پاسخ صحیح"
                              />
                              <input
                                type="text"
                                required
                                placeholder={`گزینه ${optIdx + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[qIndex].options[optIdx] =
                                    e.target.value;
                                  setQuestions(updated);
                                }}
                                className="input"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-primary w-full"
                  >
                    {creating ? "در حال ایجاد آزمون..." : "ذخیره و انتشار آزمون"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= مودال ویرایش کارنامه دانش‌آموز ================= */}
      {editingSub && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-lg">ویرایش کارنامه دانش‌آموز</h3>
              <button
                onClick={() => setEditingSub(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmission} className="space-y-4">
              <div>
                <label className="label">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    کلاس / پایه
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubClass}
                    onChange={(e) => setEditSubClass(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">
                    کد ملی
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubNationalCode}
                    onChange={(e) => setEditSubNationalCode(e.target.value)}
                    className="input tabular-nums-fa"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  نمره نهایی
                </label>
                <input
                  type="number"
                  required
                  value={editSubScore}
                  onChange={(e) => setEditSubScore(Number(e.target.value))}
                  className="input tabular-nums-fa"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="btn btn-ghost"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionId)}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= مودال ویرایش آزمون ================= */}
      {editingQuiz && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-lg max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-lg">ویرایش مشخصات آزمون</h3>
              <button
                onClick={() => setEditingQuiz(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div>
                <label className="label">
                  عنوان آزمون
                </label>
                <input
                  type="text"
                  required
                  value={editQuizTitle}
                  onChange={(e) => setEditQuizTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  اسلاگ (URL)
                </label>
                <input
                  type="text"
                  value={editQuizSlug}
                  onChange={(e) => setEditQuizSlug(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  مدت زمان (دقیقه)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editQuizDuration}
                  onChange={(e) => setEditQuizDuration(Number(e.target.value))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  توضیحات آزمون
                </label>
                <textarea
                  rows={3}
                  value={editQuizDescription}
                  onChange={(e) => setEditQuizDescription(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="btn btn-ghost"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionId)}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره آزمون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= مودال ویرایش سؤال درون آزمون ================= */}
      {editingQuestionQuiz && editingQuestionIdx !== null && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-lg">
                ویرایش سؤال شماره {editingQuestionIdx + 1}
              </h3>
              <button
                onClick={() => {
                  setEditingQuestionQuiz(null);
                  setEditingQuestionIdx(null);
                }}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="label">
                  متن سؤال (KaTeX پشتیبانی می‌شود)
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionDraft.questionText}
                  onChange={(e) =>
                    setQuestionDraft({
                      ...questionDraft,
                      questionText: e.target.value,
                    })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="label">
                  گزینه‌ها (رادیوباتن گزینه صحیح را تعیین می‌کند)
                </label>
                <div className="space-y-2">
                  {questionDraft.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="edit-question-correct"
                        checked={questionDraft.correctOption === oIdx}
                        onChange={() =>
                          setQuestionDraft({
                            ...questionDraft,
                            correctOption: oIdx,
                          })
                        }
                        title="گزینه صحیح"
                      />
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionDraft.options];
                          newOpts[oIdx] = e.target.value;
                          setQuestionDraft({
                            ...questionDraft,
                            options: newOpts,
                          });
                        }}
                        className="input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestionQuiz(null);
                    setEditingQuestionIdx(null);
                  }}
                  className="btn btn-ghost"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionId)}
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره سؤال</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
