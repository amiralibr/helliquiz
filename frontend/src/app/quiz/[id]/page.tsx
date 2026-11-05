import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuizById } from "@/lib/api";
import { getStudentSession } from "@/lib/student-session";
import QuizRunner from "@/components/QuizRunner";
import QuizLoginGate from "@/components/student/QuizLoginGate";
import { CheckCircle2, ArrowLeft, Trophy } from "lucide-react";

export const instant = false;

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;

  const [quiz, session] = await Promise.all([
    getQuizById(id).catch((error) => {
      console.error("Failed to load quiz:", error);
      return null;
    }),
    getStudentSession(),
  ]);

  if (!quiz) {
    notFound();
  }

  // ورود اجباری: بدون حساب دانش‌آموزی (ساختهٔ دبیر) هیچ آزمونی شروع نمی‌شود.
  if (!session) {
    return <QuizLoginGate quizTitle={quiz.title} />;
  }

  // اگر دانش‌آموز قبلاً در این آزمون شرکت کرده باشد، به‌جای فرم آزمون
  // کارنامه‌ی قبلی نمایش داده می‌شود (هر آزمون فقط یک بار).
  const previousAttempt = session.attempts.find(
    (attempt) => attempt.quiz.documentId === quiz.id
  );

  if (previousAttempt) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up py-10">
        <div className="card p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <h1 className="mb-2 text-xl font-black text-white">
            شما قبلاً در این آزمون شرکت کرده‌اید
          </h1>
          <p className="mb-6 text-xs leading-6 text-muted">
            {quiz.title} — هر دانش‌آموز فقط یک بار می‌تواند کارنامه‌ی هر آزمون را ثبت کند.
          </p>

          <div className="mb-6 flex items-center justify-center gap-6 rounded-xl border border-hairline bg-background/40 p-4">
            <div>
              <p className="text-[10px] text-faint">درصد</p>
              <p className="text-2xl font-black text-gradient tabular-nums-fa">
                {new Intl.NumberFormat("fa-IR").format(previousAttempt.percentage)}٪
              </p>
            </div>
            <div className="h-10 w-px bg-hairline" />
            <div>
              <p className="text-[10px] text-faint">نمره</p>
              <p className="text-2xl font-black text-white tabular-nums-fa">
                {new Intl.NumberFormat("fa-IR").format(previousAttempt.score)}
                <span className="text-sm font-medium text-muted">
                  {" / "}
                  {new Intl.NumberFormat("fa-IR").format(previousAttempt.totalScore)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/student" className="btn btn-primary w-full">
              <Trophy className="h-4 w-4" />
              مشاهده پاسخ‌نامه در پنل من
            </Link>
            <Link href="/" className="btn btn-ghost w-full">
              <ArrowLeft className="h-4 w-4" />
              بازگشت به لیست آزمون‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      quiz={quiz}
      student={{
        fullName: session.student.fullName,
        studentClass: session.student.studentClass,
        nationalCode: session.student.nationalCode,
      }}
    />
  );
}
