import Link from "next/link";
import { ArrowRight, Home, SearchX } from "lucide-react";

export const metadata = {
  title: "صفحه پیدا نشد | HelliQuiz",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg animate-fade-up flex-col items-center py-16 text-center">
      <div className="card w-full p-8 sm:p-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300">
          <SearchX className="h-8 w-8" />
        </div>

        <p className="mb-1 font-mono text-sm font-bold tracking-widest text-faint">
          ۴۰۴
        </p>
        <h1 className="mb-2 text-2xl font-black text-white">
          این صفحه پیدا نشد
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          ممکن است آزمون حذف شده باشد یا آدرس اشتباه تایپ شده باشد. از یکی از
          مسیرهای زیر ادامه بده.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            <Home className="h-4 w-4" />
            <span>فهرست آزمون‌ها</span>
          </Link>
          <Link href="/student" className="btn btn-ghost">
            <span>پنل دانش‌آموز</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
