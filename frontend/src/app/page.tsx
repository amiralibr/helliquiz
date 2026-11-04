import { Suspense } from "react";
import Link from "next/link";
import { getQuizzes } from "@/lib/api";
import { Quiz } from "@/types/quiz";
import {
  BrainCircuit,
  GraduationCap,
  Clock,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  BookOpen,
} from "lucide-react";

// کامپوننت داخلی برای واکشی و نمایش لیست آزمون‌ها
async function QuizList() {
  const quizzes: Quiz[] = await getQuizzes().catch((err) => {
    console.error("Failed to load quizzes:", err);
    return [];
  });

  if (quizzes.length === 0) {
    return (
      <div className="card text-center py-16">
        <BookOpen className="w-12 h-12 text-faint mx-auto mb-3" />
        <p className="text-muted font-medium">
          در حال حاضر آزمون فعالی یافت نشد یا سرور استراپی خاموش است.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quizzes.map((quiz, index) => (
        <div
          key={quiz.id || quiz.documentId}
          className="card card-interactive animate-fade-up group relative p-6 flex flex-col justify-between"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="badge">پایه نهم</span>
              <div className="flex items-center gap-1.5 text-xs text-muted tabular-nums-fa">
                <Clock className="w-3.5 h-3.5" />
                <span>{quiz.durationMinutes} دقیقه</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
              {quiz.title}
            </h3>

            {quiz.description && (
              <p className="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">
                {quiz.description}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1 text-xs text-muted tabular-nums-fa">
              <HelpCircle className="w-4 h-4" />
              <span>{quiz.questions?.length || 0} سوال</span>
            </div>

            <Link
              href={`/quiz/${quiz.documentId || quiz.id}`}
              className="btn btn-primary btn-sm"
            >
              <span>شروع آزمون</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// اسکلتون لودینگ برای هنگام استریم شدن دیتا
function QuizListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-56" />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      {/* نوار بالا: هدر اصلی همراه با دکمه پنل دبیر در بالا سمت چپ */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 pb-6 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">
                حلی کوئیز
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-md">
                Helli 5
              </span>
            </div>
            <p className="text-xs text-muted">
              سامانه هوشمند ارزشیابی و آزمون‌های آنلاین
            </p>
          </div>
        </div>

        {/* دکمه اختصاصی پنل مدیریت دبیر */}
        <Link href="/teacher" className="btn btn-ghost">
          <GraduationCap className="w-4 h-4" />
          <span>ورود به پنل دبیر</span>
        </Link>
      </header>

      {/* بنر خوش‌آمدگویی */}
      <section className="mb-10 text-center sm:text-right">
        <div className="badge mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>آماده سنجش دانسته‌ها؟</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          لیست <span className="text-gradient">آزمون‌های فعال</span>
        </h2>
        <p className="text-muted text-sm max-w-xl">
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
