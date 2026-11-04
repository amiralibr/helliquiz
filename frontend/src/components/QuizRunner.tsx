"use client";

import { useState, useEffect } from "react";
import { Quiz, SubmissionResponse } from "@/types/quiz";
import { submitQuizAnswers } from "@/lib/api";
import MathRenderer from "@/components/MathRenderer";
import confetti from "canvas-confetti";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Trophy, RotateCcw, UserCheck } from "lucide-react";
import Link from "next/link";

interface QuizRunnerProps {
  quiz: Quiz;
}

export default function QuizRunner({ quiz }: QuizRunnerProps) {
  // ۱. فرم اطلاعات هویتی دانش‌آموز
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [isStarted, setIsStarted] = useState(false);

  // ۲. مدیریت آزمون و پاسخ‌ها
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string | number, string>>({});
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>((quiz.durationMinutes || 15) * 60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<SubmissionResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = quiz.questions || [];

  // تایمر آزمون
  useEffect(() => {
    if (!isStarted || result || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, timeLeft, result]);

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
      // ارسال اطلاعات هویتی، زمان و پاسخ‌ها به بک‌اند
      const res = await submitQuizAnswers(quizIdentifier, {
        studentName,
        studentClass,
        nationalCode,
        timeSpentSeconds: secondsElapsed,
        answers: selectedAnswers,
      } as any);
      
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

  // گام اول: فرم دریافت اطلاعات شناسنامه‌ای دانش‌آموز پیش از شروع آزمون
  if (!isStarted) {
    const isFormValid =
      studentName.trim().length >= 3 &&
      studentClass.trim().length >= 1 &&
      /^[0-9]{10}$/.test(nationalCode.trim());

    return (
      <div className="card animate-fade-up max-w-md mx-auto my-12 p-8 text-right" dir="rtl">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mb-4 text-white font-black text-xl shadow-lg shadow-indigo-500/30">
          HQ
        </div>
        <h2 className="text-2xl font-black text-white mb-2">
          ورود به آزمون {quiz.title}
        </h2>
        <p className="text-xs text-muted mb-6">
          جهت ثبت کارنامه برای دبیر، لطفاً مشخصات فردی خود را با دقت وارد کنید.
        </p>

        <div className="space-y-4 text-sm">
          <div>
            <label className="label">نام و نام خانوادگی</label>
            <input
              type="text"
              placeholder="مثال: امیرعلی برخورداری"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">کلاس / پایه</label>
            <input
              type="text"
              placeholder="مثال: نهم ۱ - علامه حلی"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">کد ملی (۱۰ رقم بدون خط تیره)</label>
            <input
              type="text"
              maxLength={10}
              placeholder="0012345678"
              value={nationalCode}
              onChange={(e) => setNationalCode(e.target.value)}
              className="input tabular-nums-fa"
            />
          </div>

          <button
            disabled={!isFormValid}
            onClick={() => setIsStarted(true)}
            className="btn btn-primary w-full mt-4"
          >
            تایید و شروع آزمون
          </button>
        </div>
      </div>
    );
  }

  // گام دوم: محیط آزمون و نمایش نتیجه پس از ثبت
  return (
    <div className="space-y-8 pb-16" dir="rtl">
      <div className="glass sticky top-20 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
          <p className="text-xs text-muted">
            دانش‌آموز: <span className="font-semibold text-foreground">{studentName}</span> ({studentClass})
          </p>
        </div>

        {!result && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums-fa ${
              timeLeft < 180
                ? "timer-danger"
                : "text-indigo-300 bg-indigo-500/10 border border-indigo-500/30"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>زمان باقی‌مانده: {formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-up p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-violet-950/20">
          <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-right">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-indigo-300">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold text-sm">نتیجه ثبت‌شده برای دبیر</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                درصد کسب‌شده: <span className="text-gradient tabular-nums-fa">{result.percentage}٪</span>
              </h2>
              <p className="text-sm text-muted">
                نمره کسب‌شده: <span className="font-bold text-foreground tabular-nums-fa">{result.score}</span> از{" "}
                <span className="tabular-nums-fa">{result.totalScore || result.totalQuestions}</span>
                {result.correctCount !== undefined && (
                  <span className="mr-2 text-xs opacity-80">
                    ({result.correctCount} پاسخ درست از {result.totalQuestions} سؤال)
                  </span>
                )}
              </p>
            </div>
            <Link href="/" className="btn btn-primary mt-4 sm:mt-0">
              <RotateCcw className="h-4 w-4" />
              بازگشت به لیست آزمون‌ها
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
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
            String(detail?.isCorrect) === "true"
          );

          const optionsList = Array.isArray(question.options)
            ? question.options.map((opt, i) => ({ key: String(i), label: opt }))
            : Object.entries(question.options || {}).map(([key, label]) => ({ key, label }));

          return (
            <div
              key={qKey || index}
              className={`card animate-fade-up p-6 ${
                result
                  ? isQuestionCorrect
                    ? "border-emerald-500/40"
                    : "border-rose-500/40"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                  {index + 1}
                </span>
                <div className="text-base font-semibold leading-relaxed text-foreground">
                  <MathRenderer content={questionText} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {optionsList.map(({ key, label }, optIdx) => {
                  const isSelected = String(selectedOption) === String(key);
                  const serverCorrectKey = detail?.correctAnswer;

                  const isThisCorrectOption =
                    serverCorrectKey !== undefined &&
                    (String(serverCorrectKey) === String(key) || Number(serverCorrectKey) === optIdx);

                  let optionClass = "option-btn";
                  if (result) {
                    if (isThisCorrectOption) {
                      optionClass += " option-correct";
                    } else if (isSelected && !isQuestionCorrect) {
                      optionClass += " option-wrong line-through opacity-80";
                    }
                  } else if (isSelected) {
                    optionClass += " option-selected";
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={Boolean(result) || isSubmitting}
                      onClick={() => handleSelectOption(qKey, key)}
                      className={optionClass}
                    >
                      <span className="option-key">{optIdx + 1}</span>
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
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      پاسخ شما صحیح است
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400">
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
            className="btn btn-primary px-8 py-3"
          >
            {isSubmitting ? "در حال تصحیح و ثبت کارنامه..." : "ثبت و پایان آزمون"}
          </button>
        </div>
      )}
    </div>
  );
}
