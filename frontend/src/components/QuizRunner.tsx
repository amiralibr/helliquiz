"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Quiz, QuizResult } from "@/types/quiz";
import MathRenderer from "@/components/MathRenderer";
import confetti from "canvas-confetti";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
  ArrowLeft,
  UserCheck,
  LogIn,
  Send,
  Info,
} from "lucide-react";

interface QuizRunnerProps {
  quiz: Quiz;
  student?: {
    fullName: string;
    studentClass: string;
    nationalCode: string;
  } | null;
}

const NATIONAL_CODE_PATTERN = /^\d{10}$/;

export default function QuizRunner({ quiz, student = null }: QuizRunnerProps) {
  /* ---------- مرحله ۱: شناسنامه ---------- */
  const [studentName, setStudentName] = useState(student?.fullName ?? "");
  const [studentClass, setStudentClass] = useState(student?.studentClass ?? "");
  const [nationalCode, setNationalCode] = useState(student?.nationalCode ?? "");
  const [isStarted, setIsStarted] = useState(false);

  /* ---------- مرحله ۲: آزمون ---------- */
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [totalSeconds] = useState(() => (quiz.durationMinutes || 15) * 60);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const questions = quiz.questions ?? [];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const submitRef = useRef<() => void>(() => {});

  /* ---------- تایمر ---------- */
  useEffect(() => {
    if (!isStarted || result) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, result]);

  /* ---------- ثبت خودکار در پایان زمان ---------- */
  useEffect(() => {
    if (isStarted && !result && timeLeft === 0) {
      submitRef.current();
    }
  }, [timeLeft, isStarted, result]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || result) return;

    setIsSubmitting(true);
    setError(null);
    setConfirmingSubmit(false);

    try {
      const response = await fetch(
        `/api/strapi/quizzes/${encodeURIComponent(quiz.documentId || quiz.id)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            studentName,
            studentClass,
            nationalCode,
            timeSpentSeconds: Math.min(secondsElapsed, totalSeconds),
            answers,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      // قبلاً ثبت شده: نتیجه‌ی قبلی نمایش داده می‌شود
      if (response.status === 409) {
        const previous: QuizResult | undefined = data?.result;
        if (previous) {
          setResult({ ...previous, details: previous.details ?? [], alreadySubmitted: true });
          return;
        }
        setError(data?.error?.message || "شما قبلاً در این آزمون شرکت کرده‌اید.");
        return;
      }

      if (!response.ok || !data?.result) {
        throw new Error(
          data?.error?.message || "خطا در ثبت و تصحیح پاسخ‌ها. دوباره تلاش کنید."
        );
      }

      const payload: QuizResult = data.result;
      setResult(payload);

      if (payload.percentage >= 50) {
        confetti({ particleCount: 140, spread: 85, origin: { y: 0.65 } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت پاسخ‌ها");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    answers,
    isSubmitting,
    nationalCode,
    quiz.documentId,
    quiz.id,
    result,
    secondsElapsed,
    studentClass,
    studentName,
    totalSeconds,
  ]);

  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isFormValid =
    studentName.trim().length >= 3 &&
    studentClass.trim().length >= 1 &&
    NATIONAL_CODE_PATTERN.test(nationalCode.trim());

  /* ==================== شناسنامه ==================== */
  if (!isStarted) {
    return (
      <div className="mx-auto my-10 max-w-md animate-fade-up">
        <div className="card p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-500/30">
            HQ
          </div>

          <h1 className="mb-2 text-2xl font-black text-white">
            ورود به آزمون
          </h1>
          <p className="mb-6 text-xs text-muted">
            {quiz.title}
          </p>

          {student ? (
            <div className="alert alert-success mb-5 items-center">
              <UserCheck className="h-5 w-5 shrink-0" />
              <span className="text-xs leading-6">
                با حساب <b>{student.fullName}</b> وارد شده‌اید؛ مشخصات به‌صورت خودکار
                از پروفایل شما ثبت می‌شود.
              </span>
            </div>
          ) : (
            <div className="alert alert-warning mb-5 items-start">
              <Info className="h-5 w-5 shrink-0" />
              <span className="text-xs leading-6">
                اگر وارد پنل دانش‌آموزی شوید، کارنامه به‌طور خودکار در پنل شما ذخیره
                می‌شود و بعداً می‌توانید پاسخ‌های درست و غلط را ببینید.
              </span>
            </div>
          )}

          <div className="space-y-4 text-sm">
            <div>
              <label className="label" htmlFor="student-name">
                نام و نام خانوادگی
              </label>
              <input
                id="student-name"
                type="text"
                placeholder="مثال: امیرعلی برخورداری"
                value={studentName}
                disabled={Boolean(student)}
                onChange={(event) => setStudentName(event.target.value)}
                className="input disabled:opacity-60"
              />
            </div>

            <div>
              <label className="label" htmlFor="student-class">
                کلاس / پایه
              </label>
              <input
                id="student-class"
                type="text"
                placeholder="مثال: نهم ۱"
                value={studentClass}
                disabled={Boolean(student)}
                onChange={(event) => setStudentClass(event.target.value)}
                className="input disabled:opacity-60"
              />
            </div>

            <div>
              <label className="label" htmlFor="student-national-code">
                کد ملی (۱۰ رقم)
              </label>
              <input
                id="student-national-code"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="0012345678"
                value={nationalCode}
                disabled={Boolean(student)}
                onChange={(event) =>
                  setNationalCode(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="input tabular-nums-fa disabled:opacity-60"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-hairline bg-background/40 px-3 py-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                مدت آزمون
              </span>
              <b className="tabular-nums-fa">{quiz.durationMinutes} دقیقه</b>
            </div>

            <button
              type="button"
              disabled={!isFormValid}
              onClick={() => setIsStarted(true)}
              className="btn btn-primary mt-2 w-full"
            >
              تایید و شروع آزمون
            </button>

            {!student && (
              <Link
                href="/student"
                className="flex items-center justify-center gap-1.5 text-xs text-muted transition hover:text-indigo-300"
              >
                <LogIn className="h-3.5 w-3.5" />
                ورود / ثبت‌نام پنل دانش‌آموزی
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ==================== محیط آزمون ==================== */
  return (
    <div className="space-y-6 pb-20">
      <div className="glass sticky top-20 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <h1 className="text-lg font-bold text-white sm:text-xl">{quiz.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {studentName} · {studentClass} ·{" "}
            <span className="tabular-nums-fa">{answeredCount}</span> از{" "}
            <span className="tabular-nums-fa">{questions.length}</span> پاسخ داده شده
          </p>
        </div>

        {!result && (
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums-fa ${
              timeLeft < 180
                ? "timer-danger"
                : "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {result && (
        <section className="card animate-fade-up border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-violet-950/20 p-6">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-right">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-indigo-300">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  {result.alreadySubmitted
                    ? "نتیجه‌ی قبلی شما در این آزمون"
                    : "نتیجه ثبت شد"}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">
                درصد کسب‌شده:{" "}
                <span className="text-gradient tabular-nums-fa">
                  {result.percentage}٪
                </span>
              </h2>
              <p className="text-sm text-muted">
                نمره: <b className="text-foreground tabular-nums-fa">{result.score}</b>{" "}
                از <span className="tabular-nums-fa">{result.totalScore}</span>
                <span className="mr-2 text-xs opacity-80">
                  ({result.correctCount} درست از {result.totalQuestions} سؤال)
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Link href="/student" className="btn btn-primary">
                <UserCheck className="h-4 w-4" />
                مشاهده در پنل من
              </Link>
              <Link href="/" className="btn btn-ghost">
                <ArrowLeft className="h-4 w-4" />
                بازگشت به لیست آزمون‌ها
              </Link>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        {questions.map((question, index) => {
          const qKey = String(question.documentId || question.id);
          const detail = result?.details?.[index];
          const selectedIndex = result ? (detail?.selectedOption ?? null) : (answers[qKey] ?? null);
          const correctIndex = detail?.correctAnswer ?? null;
          const isCorrect = Boolean(detail?.isCorrect);

          return (
            <article
              key={qKey || index}
              className={`card animate-fade-up p-5 sm:p-6 ${
                result
                  ? isCorrect
                    ? "border-emerald-500/40"
                    : "border-rose-500/40"
                  : ""
              }`}
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-xs font-bold text-indigo-300 tabular-nums-fa">
                  {index + 1}
                </span>
                <div className="text-base font-semibold leading-relaxed text-foreground">
                  <MathRenderer content={question.questionText} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(question.options || []).map((label, optionIndex) => {
                  const isSelected = selectedIndex === optionIndex;
                  const isCorrectOption = correctIndex === optionIndex;

                  let className = "option-btn";
                  if (result) {
                    if (isCorrectOption) className += " option-correct";
                    else if (isSelected && !isCorrect) className += " option-wrong";
                  } else if (isSelected) {
                    className += " option-selected";
                  }

                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      disabled={Boolean(result) || isSubmitting}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [qKey]: optionIndex }))
                      }
                      className={className}
                    >
                      <span className="option-key tabular-nums-fa">{optionIndex + 1}</span>
                      <span className="flex-1">
                        <MathRenderer content={label} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      پاسخ شما صحیح است
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400">
                      <XCircle className="h-4 w-4" />
                      {selectedIndex === null
                        ? "به این سؤال پاسخ نداده‌اید"
                        : "پاسخ اشتباه بود"}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!result && (
        <div className="flex flex-col items-stretch justify-end gap-3 pt-2 sm:flex-row sm:items-center">
          {confirmingSubmit ? (
            <>
              <span className="text-xs text-amber-300 sm:mr-auto">
                {unansweredCount > 0
                  ? `${unansweredCount} سؤال بی‌پاسخ مانده است. با این حال ثبت شود؟`
                  : "از ثبت پاسخ‌ها مطمئن هستید؟"}
              </span>
              <button
                type="button"
                onClick={() => setConfirmingSubmit(false)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn btn-primary px-8"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "در حال تصحیح و ثبت..." : "بله، ثبت نهایی"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setConfirmingSubmit(true)}
              className="btn btn-primary px-8 py-3"
            >
              {isSubmitting ? "در حال تصحیح و ثبت کارنامه..." : "ثبت و پایان آزمون"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
