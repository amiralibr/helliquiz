"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  LogOut,
  Play,
  Target,
  TicketCheck,
  Trophy,
  XCircle,
  Timer,
  BookOpenCheck,
} from "lucide-react";
import MathRenderer from "@/components/MathRenderer";
import type { Attempt, StudentSession } from "@/lib/student-api";
import type { Quiz } from "@/types/quiz";

interface StudentDashboardProps {
  session: StudentSession;
  quizzes: Quiz[];
}

const faDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const faNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (minutes === 0) return `${faNumber(rest)} ثانیه`;
  return `${faNumber(minutes)} دقیقه و ${faNumber(rest)} ثانیه`;
};

const maskNationalCode = (code: string) =>
  code.length === 10 ? `${code.slice(0, 3)}****${code.slice(-3)}` : code;

export default function StudentDashboard({ session, quizzes }: StudentDashboardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(
    session.attempts[0]?.documentId ?? null
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const { student, attempts, stats } = session;

  const attemptsByQuiz = useMemo(() => {
    const map = new Map<string, Attempt>();
    for (const attempt of attempts) {
      if (attempt.quiz.documentId) map.set(attempt.quiz.documentId, attempt);
    }
    return map;
  }, [attempts]);

  const availableQuizzes = quizzes.filter((quiz) => !attemptsByQuiz.has(quiz.id));

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/student/logout", { method: "POST" });
    router.refresh();
  };

  const initial = student.fullName.trim().charAt(0) || "د";

  return (
    <div className="space-y-8 pb-16">
      {/* ==================== هدر پروفایل ==================== */}
      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
              {initial}
            </div>
            <div>
              <div className="badge mb-2">
                <TicketCheck className="h-3 w-3" />
                پنل دانش‌آموز
              </div>
              <h1 className="text-2xl font-black text-white">{student.fullName}</h1>
              <p className="mt-1 text-xs text-muted">
                {student.studentClass} · کد ملی{" "}
                <span className="tabular-nums-fa">{maskNationalCode(student.nationalCode)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="btn btn-ghost btn-sm">
              <Play className="h-3.5 w-3.5" />
              آزمون‌های فعال
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn btn-ghost btn-sm text-rose-300 hover:text-rose-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "در حال خروج..." : "خروج"}
            </button>
          </div>
        </div>
      </header>

      {/* ==================== آمار ==================== */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card stat-card">
          <div className="stat-icon">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="stat-label">آزمون‌های شرکت‌کرده</p>
            <h3 className="stat-value tabular-nums-fa">{faNumber(stats.attempts)}</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon stat-icon-success">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="stat-label">میانگین درصد</p>
            <h3 className="stat-value tabular-nums-fa">{faNumber(stats.averagePercentage)}٪</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon stat-icon-warning">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="stat-label">بهترین درصد</p>
            <h3 className="stat-value tabular-nums-fa">{faNumber(stats.bestPercentage)}٪</h3>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon">
            <Timer className="h-6 w-6" />
          </div>
          <div>
            <p className="stat-label">مجموع زمان آزمون</p>
            <h3 className="stat-value text-base tabular-nums-fa">
              {formatDuration(stats.totalTimeSpentSeconds)}
            </h3>
          </div>
        </div>
      </section>

      {/* ==================== کارنامه‌ها ==================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Award className="h-5 w-5 text-indigo-300" />
            کارنامه‌های من
          </h2>
          <span className="text-xs text-muted tabular-nums-fa">
            {faNumber(attempts.length)} نتیجه
          </span>
        </div>

        {attempts.length === 0 ? (
          <div className="card py-16 text-center">
            <BookOpenCheck className="mx-auto mb-3 h-12 w-12 text-faint" />
            <p className="font-medium text-muted">هنوز در هیچ آزمونی شرکت نکرده‌اید.</p>
            <p className="mt-2 text-xs text-faint">
              یکی از آزمون‌های فعال را شروع کنید تا کارنامه‌تان اینجا ثبت شود.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt, index) => {
              const isOpen = expanded === attempt.documentId;
              const passed = attempt.percentage >= 50;

              return (
                <article
                  key={attempt.documentId}
                  className="card animate-fade-up overflow-hidden"
                  style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isOpen ? null : attempt.documentId)
                    }
                    aria-expanded={isOpen}
                    className="flex w-full flex-col gap-5 p-5 text-right sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className="score-ring shrink-0"
                        style={
                          {
                            "--ring-value": attempt.percentage,
                            "--ring-color": passed
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                          } as React.CSSProperties
                        }
                      >
                        <span className="tabular-nums-fa">{faNumber(attempt.percentage)}٪</span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-white">
                          {attempt.quiz.title}
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="flex items-center gap-1 tabular-nums-fa">
                            <Target className="h-3.5 w-3.5" />
                            {faNumber(attempt.correctCount)} از{" "}
                            {faNumber(attempt.totalQuestions)} درست
                          </span>
                          <span className="flex items-center gap-1 tabular-nums-fa">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(attempt.timeSpentSeconds)}
                          </span>
                          <span className="tabular-nums-fa">{faDate(attempt.createdAt)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-faint">نمره</p>
                        <p className="font-black text-white tabular-nums-fa">
                          {faNumber(attempt.score)}
                          <span className="text-xs font-medium text-muted">
                            {" "}
                            / {faNumber(attempt.totalScore)}
                          </span>
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-muted transition-transform ${
                          isOpen ? "rotate-180 text-indigo-300" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-hairline bg-background/30 p-5 sm:p-6">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">
                          پاسخ‌نامه تفکیکی
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
                            پاسخ صحیح
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/70" />
                            انتخاب شما (نادرست)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {attempt.details.map((detail, questionIndex) => (
                          <div
                            key={questionIndex}
                            className={`rounded-xl border p-4 ${
                              detail.isCorrect
                                ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                                : "border-rose-500/25 bg-rose-500/[0.06]"
                            }`}
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 text-sm leading-7 text-foreground">
                                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-background/60 text-[10px] font-bold text-muted tabular-nums-fa">
                                  {faNumber(questionIndex + 1)}
                                </span>
                                <MathRenderer content={detail.questionText} />
                              </div>
                              <span
                                className={`flex shrink-0 items-center gap-1 text-[11px] font-bold ${
                                  detail.isCorrect ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {detail.isCorrect ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" />
                                )}
                                {detail.isCorrect ? "درست" : "نادرست"}
                              </span>
                            </div>

                            {detail.options && detail.options.length > 0 ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {detail.options.map((option, optionIndex) => {
                                  const isCorrectOption =
                                    detail.correctAnswer === optionIndex;
                                  const isChosen = detail.selectedOption === optionIndex;

                                  let tone =
                                    "border-hairline bg-background/40 text-muted";
                                  if (isCorrectOption) {
                                    tone =
                                      "border-emerald-500/45 bg-emerald-500/10 text-emerald-200";
                                  } else if (isChosen) {
                                    tone =
                                      "border-rose-500/45 bg-rose-500/10 text-rose-200";
                                  }

                                  return (
                                    <div
                                      key={optionIndex}
                                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}
                                    >
                                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-background/60 text-[10px] font-bold tabular-nums-fa">
                                        {faNumber(optionIndex + 1)}
                                      </span>
                                      <span className="flex-1">
                                        <MathRenderer content={option} />
                                      </span>
                                      {isChosen && (
                                        <span className="text-[10px] font-bold opacity-80">
                                          شما
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tabular-nums-fa">
                                <span>
                                  پاسخ شما:{" "}
                                  <b>
                                    {detail.selectedOption === null
                                      ? "بی‌پاسخ"
                                      : `گزینه ${faNumber(detail.selectedOption + 1)}`}
                                  </b>
                                </span>
                                <span>
                                  گزینه صحیح:{" "}
                                  <b className="text-emerald-400">
                                    {detail.correctAnswer === null
                                      ? "—"
                                      : `گزینه ${faNumber(detail.correctAnswer + 1)}`}
                                  </b>
                                </span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {attempt.quiz.documentId && (
                        <div className="mt-4 flex justify-end">
                          <Link
                            href={`/quiz/${attempt.quiz.documentId}`}
                            className="btn btn-ghost btn-sm"
                          >
                            <Play className="h-3.5 w-3.5" />
                            مشاهده صفحه آزمون
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================== آزمون‌های در دسترس ==================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Play className="h-5 w-5 text-indigo-300" />
            آزمون‌های در دسترس
          </h2>
          <span className="text-xs text-muted tabular-nums-fa">
            {faNumber(availableQuizzes.length)} آزمون
          </span>
        </div>

        {availableQuizzes.length === 0 ? (
          <div className="card py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400/70" />
            <p className="text-sm font-medium text-muted">
              در حال حاضر آزمون باقی‌مانده‌ای برای شما نیست.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableQuizzes.map((quiz, index) => (
              <div
                key={quiz.id}
                className="card card-interactive flex flex-col justify-between p-5 animate-fade-up"
                style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="badge">جدید</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted tabular-nums-fa">
                      <Clock className="h-3.5 w-3.5" />
                      {faNumber(quiz.durationMinutes)} دقیقه
                    </span>
                  </div>
                  <h3 className="mb-2 text-base font-bold text-white">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="line-clamp-2 text-xs leading-6 text-muted">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
                  <span className="text-[11px] text-muted tabular-nums-fa">
                    {faNumber(quiz.questionCount ?? quiz.questions?.length ?? 0)} سؤال
                  </span>
                  <Link href={`/quiz/${quiz.id}`} className="btn btn-primary btn-sm">
                    <Play className="h-3.5 w-3.5" />
                    شروع آزمون
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
