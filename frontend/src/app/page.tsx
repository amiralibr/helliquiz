import { Suspense } from "react";
import Link from "next/link";
import { getQuizzes } from "@/lib/api";
import { Quiz } from "@/types/quiz";
import { BookOpen, Clock, HelpCircle, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

// کامپوننت لودینگ موقت حین واکشی اطلاعات از Strapi
function QuizListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex h-56 animate-pulse flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-10 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// کامپوننت داخلی واکشی و رندر داده‌ها
async function QuizList() {
  let quizzes: Quiz[] = [];
  let error: string | null = null;

  try {
    quizzes = await getQuizzes();
  } catch (err: any) {
    error = err.message || "خطا در برقراری ارتباط با سرور کوئیز";
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <HelpCircle className="mx-auto h-10 w-10 text-zinc-400" />
        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          هنوز آزمونی ثبت نشده است
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          از طریق پنل ادمین استراپی می‌توانید آزمون‌های جدید اضافه کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-blue-500"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                آزمون استاندارد
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Clock className="h-3.5 w-3.5" />
                {quiz.durationMinutes} دقیقه
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {quiz.title}
            </h2>

            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {quiz.description || "توضیحاتی برای این آزمون ثبت نشده است."}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <Link
              href={`/quiz/${quiz.documentId || quiz.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              <span>ورود به آزمون</span>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// کامپوننت اصلی روت با پشتیبانی کامل از Suspense
export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          آزمون‌های فعال علامه حلی
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          برای سنجش سطح علمی و آمادگی در چالش‌ها، یکی از آزمون‌های زیر را انتخاب کنید.
        </p>
      </div>

      <Suspense fallback={<QuizListSkeleton />}>
        <QuizList />
      </Suspense>
    </div>
  );
}
