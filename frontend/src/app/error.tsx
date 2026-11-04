"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg animate-fade-up flex-col items-center py-16 text-center">
      <div className="card w-full p-8 sm:p-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="mb-2 text-2xl font-black text-white">
          چیزی درست پیش نرفت
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          احتمالاً ارتباط با سرور آزمون قطع شده است. یک بار دیگر تلاش کن؛ اگر
          مشکل ادامه داشت، چند لحظه بعد برگرد.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshCw className="h-4 w-4" />
            <span>تلاش دوباره</span>
          </button>
          <Link href="/" className="btn btn-ghost">
            <Home className="h-4 w-4" />
            <span>بازگشت به خانه</span>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-5 font-mono text-xs text-faint">
            کد خطا: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
