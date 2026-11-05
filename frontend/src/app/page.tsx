import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getQuizzes } from "@/lib/api";
import { getStudentSession } from "@/lib/student-session";
import { Quiz } from "@/types/quiz";
import {
  BrainCircuit,
  GraduationCap,
  Clock,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  BookOpen,
  UserRound,
  CheckCircle2,
  Trophy,
} from "lucide-react";

// کامپوننت داخلی برای واکشی و نمایش لیست آزمون‌ها
async function QuizList() {
  // لیست آزمون‌ها در هر درخواست تازه خوانده می‌شود (نه در پیش‌رندر)
  await connection();

  const [quizzes, session] = await Promise.all([
    getQuizzes().catch((err) => {
      console.error("Failed to load quizzes:", err);
      return [] as Quiz[];
    }),
    getStudentSession(),
  ]);

  const takenQuizIds = new Set(
    (session?.attempts ?? [])
      .map((attempt) => attempt.quiz.documentId)
      .filter((id): id is string => Boolean(id))
  );

  if (quizzes.length === 0) {
    return (
      <div className="card py-16 text-center">
        <BookOpen className="mx-auto mb-3 h-12 w-12 text-faint" />
        <p className="font-medium text-muted">
          در حال حاضر آزمون فعالی یافت نشد یا سرور آزمون در دسترس نیست.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz, index) => {
        const taken = takenQuizIds.has(quiz.id);

        return (
          <div
            key={quiz.id || index}
            className="card card-interactive animate-fade-up group relative flex flex-col justify-between p-6"
            style={{ animationDelay: `${Math.min(index * 70, 400)}ms` }}
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="badge">پایه نهم</span>
                <div className="flex items-center gap-1.5 text-xs text-muted tabular-nums-fa">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{quiz.durationMinutes} دقیقه</span>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-indigo-300">
                {quiz.title}
              </h3>

              {quiz.description && (
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted">
                  {quiz.description}
                </p>
              )}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-hairline pt-4">
              <div className="flex items-center gap-1 text-xs text-muted tabular-nums-fa">
                <HelpCircle className="h-4 w-4" />
                <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} سوال</span>
              </div>

              {taken ? (
                <Link href="/student" className="btn btn-ghost btn-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>شرکت کرده‌اید</span>
                </Link>
              ) : (
                <Link href={`/quiz/${quiz.id}`} className="btn btn-primary btn-sm">
                  <span>شروع آزمون</span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// اسکلتون لودینگ برای هنگام استریم شدن دیتا
function QuizListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-56" />
      ))}
    </div>
  );
}

async function StudentShortcut() {
  const session = await getStudentSession();

  if (!session) {
    return (
      <div className="card mb-8 flex flex-col items-start justify-between gap-4 border-indigo-500/20 bg-gradient-to-l from-indigo-950/30 to-transparent p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">پنل دانش‌آموزی</p>
            <p className="mt-1 text-xs text-muted">
              وارد شوید تا کارنامه‌ها و پاسخ‌نامه‌ی تفکیکی همه‌ی آزمون‌هایتان را یک‌جا ببینید.
            </p>
          </div>
        </div>
        <Link href="/student" className="btn btn-primary btn-sm shrink-0">
          ورود دانش‌آموز
        </Link>
      </div>
    );
  }

  const best = session.stats.bestPercentage;

  return (
    <div className="card mb-8 flex flex-col items-start justify-between gap-4 border-emerald-500/20 bg-gradient-to-l from-emerald-950/20 to-transparent p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            خوش آمدی، {session.student.fullName}
          </p>
          <p className="mt-1 text-xs text-muted tabular-nums-fa">
            {session.stats.attempts} آزمون ثبت‌شده · میانگین{" "}
            {session.stats.averagePercentage}٪ · بهترین نتیجه {best}٪
          </p>
        </div>
      </div>
      <Link href="/student" className="btn btn-primary btn-sm shrink-0">
        مشاهده پنل من
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* نوار بالا: هدر اصلی همراه با دکمه پنل دبیر در بالا سمت چپ */}
      <header className="mb-8 flex flex-col items-center justify-between gap-4 border-b border-hairline pb-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">حلی کوئیز</h1>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Helli 5
              </span>
            </div>
            <p className="text-xs text-muted">
              سامانه هوشمند ارزشیابی و آزمون‌های آنلاین
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/student" className="btn btn-ghost">
            <UserRound className="h-4 w-4" />
            <span>پنل دانش‌آموز</span>
          </Link>
          <Link href="/teacher" className="btn btn-ghost">
            <GraduationCap className="h-4 w-4" />
            <span>ورود به پنل دبیر</span>
          </Link>
        </div>
      </header>

      <Suspense fallback={<div className="skeleton mb-8 h-24" />}>
        <StudentShortcut />
      </Suspense>

      {/* بنر خوش‌آمدگویی */}
      <section className="mb-8 text-center sm:text-right">
        <div className="badge mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>آماده سنجش دانسته‌ها؟</span>
        </div>
        <h2 className="mb-2 text-3xl font-extrabold text-white">
          لیست <span className="text-gradient">آزمون‌های فعال</span>
        </h2>
        <p className="max-w-xl text-sm text-muted">
          آزمون مورد نظر خود را انتخاب کرده و با دقت در زمان تعیین‌شده به سوالات پاسخ دهید.
        </p>
      </section>

      {/* بارگذاری استریم آزمون‌ها با Suspense */}
      <Suspense fallback={<QuizListSkeleton />}>
        <QuizList />
      </Suspense>
    </div>
  );
}
