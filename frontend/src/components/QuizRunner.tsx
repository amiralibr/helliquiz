"use client";

import { useState, useEffect } from "react";
import { Quiz, SubmissionResponse } from "@/types/quiz";
import { submitQuizAnswers } from "@/lib/api";
import MathRenderer from "@/components/MathRenderer";
import confetti from "canvas-confetti";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Trophy, RotateCcw } from "lucide-react";
import Link from "next/link";

interface QuizRunnerProps {
  quiz: Quiz;
}

export default function QuizRunner({ quiz }: QuizRunnerProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string | number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>((quiz.durationMinutes || 15) * 60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<SubmissionResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = quiz.questions || [];

  useEffect(() => {
    if (result || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const handleSelectOption = (questionKey: string | number, optionKey: string) => {
    if (result) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [String(questionKey)]: optionKey,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || result) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const quizIdentifier = quiz.documentId || quiz.id;
      const res = await submitQuizAnswers(quizIdentifier, selectedAnswers);
      
      console.log("📥 SUBMIT RESULT RESPONSE:", res);
      setResult(res.result);

      if (res.result.percentage >= 50) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      setError(err.message || "خطا در ثبت و تصحیح پاسخ‌ها");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getQuestionDetail = (question: any, index: number) => {
    if (!result || !result.details) return null;
    
    const qId = String(question.id || "");
    const qDocId = String(question.documentId || "");

    if (Array.isArray(result.details)) {
      return result.details.find((d: any, idx: number) => {
        const dId = String(d.questionId || d.id || d.question_id || "");
        return (
          (qDocId && dId === qDocId) ||
          (qId && dId === qId) ||
          idx === index
        );
      }) || result.details[index] || null;
    }
    
    return (
      (qDocId && result.details[qDocId]) ||
      (qId && result.details[qId]) ||
      null
    );
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="sticky top-20 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{quiz.title}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            تعداد کل سوالات: {questions.length} سوال
          </p>
        </div>

        {!result && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${
              timeLeft < 180
                ? "bg-red-100 text-red-700 animate-pulse dark:bg-red-950/50 dark:text-red-400"
                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>زمان باقی‌مانده: {formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-zinc-900 dark:border-blue-900/50 dark:from-zinc-900 dark:to-zinc-900/80 dark:text-zinc-100">
          <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-right">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold text-sm">نتیجه آزمون شما</span>
              </div>
              <h2 className="text-2xl font-black">درصد کسب‌شده: {result.percentage}٪</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                نمره کسب‌شده: {(result as any).score} از {(result as any).totalScore || result.totalQuestions}
                  {((result as any).correctCount !== undefined) && (
                   <span className="mr-2 text-xs opacity-80">
                      ({(result as any).correctCount} پاسخ درست از {result.totalQuestions} سؤال)
                   </span>
                  )}
              </p>

            </div>
            <Link
              href="/"
              className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <RotateCcw className="h-4 w-4" />
              بازگشت به لیست آزمون‌ها
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((question, index) => {
          const qKey = (question.documentId || question.id) as string | number;
          const detail = getQuestionDetail(question, index);
          const selectedOption = selectedAnswers[String(qKey)];
          const questionText = question.questionText || question.prompt || "";

          const isQuestionCorrect = Boolean(
            detail?.isCorrect === true ||
            String(detail?.isCorrect) === "true" ||
            (detail?.score !== undefined && Number(detail.score) > 0)
          );

          const optionsList = Array.isArray(question.options)
            ? question.options.map((opt, i) => ({ key: String(i), label: opt }))
            : Object.entries(question.options || {}).map(([key, label]) => ({ key, label }));

          return (
            <div
              key={qKey || index}
              className={`rounded-xl border p-6 transition-all ${
                result
                  ? isQuestionCorrect
                    ? "border-emerald-200 bg-emerald-50/15 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                    : "border-rose-200 bg-rose-50/15 dark:border-rose-900/40 dark:bg-rose-950/10"
                  : "border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {index + 1}
                </span>
                <div className="text-base font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                  <MathRenderer content={questionText} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {optionsList.map(({ key, label }, optIdx) => {
                  const isSelected = String(selectedOption) === String(key);

                  const serverCorrectKey = detail?.correctAnswer ?? detail?.correctOption ?? detail?.answer;

                  const isThisCorrectOption =
                    (serverCorrectKey !== undefined && String(serverCorrectKey) === String(key)) ||
                    (serverCorrectKey !== undefined && Number(serverCorrectKey) === optIdx);

                  let optionStyle =
                    "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700";
                  let badgeStyle =
                    "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

                  if (result) {
                    if (isThisCorrectOption) {
                      optionStyle =
                        "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-2 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500";
                      badgeStyle =
                        "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500";
                    } else if (isSelected && !isQuestionCorrect) {
                      optionStyle =
                        "border-rose-500 bg-rose-50 text-rose-900 line-through dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-600";
                      badgeStyle =
                        "border-rose-500 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500";
                    }
                  } else if (isSelected) {
                    optionStyle =
                      "border-blue-600 bg-blue-50 text-blue-950 font-medium ring-2 ring-blue-600/25 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100";
                    badgeStyle =
                      "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500";
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={Boolean(result) || isSubmitting}
                      onClick={() => handleSelectOption(qKey, key)}
                      className={`flex items-center gap-3 rounded-lg border p-3.5 text-right text-sm transition-all ${optionStyle}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors ${badgeStyle}`}
                      >
                        {optIdx + 1}
                      </span>
                      <span className="flex-1">
                        <MathRenderer content={label} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                  {isQuestionCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      پاسخ شما صحیح است
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <XCircle className="h-4 w-4" />
                      پاسخ اشتباه بود
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <div className="flex justify-end pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "در حال تصحیح آزمون..." : "ثبت و پایان آزمون"}
          </button>
        </div>
      )}
    </div>
  );
}
