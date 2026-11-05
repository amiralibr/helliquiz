"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, AlertCircle, Loader2, Lock, KeyRound } from "lucide-react";

interface QuizLoginGateProps {
  quizTitle: string;
}

/**
 * دروازهٔ ورود به آزمون.
 *
 * تا وقتی دانش‌آموز با کد ملی و رمزی که دبیر ساخته وارد نشود، آزمون شروع
 * نمی‌شود؛ نام و کلاس هم از خودش پرسیده نمی‌شود و از حسابش خوانده می‌شود.
 */
export default function QuizLoginGate({ quizTitle }: QuizLoginGateProps) {
  const router = useRouter();

  const [nationalCode, setNationalCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalCode, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message || "ورود انجام نشد. کد ملی و رمز عبور را بررسی کنید."
        );
      }

      // صفحه دوباره از سرور رندر می‌شود و این بار با نشستِ دانش‌آموز،
      // فرم شروع آزمون نمایش داده می‌شود.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای نامشخص");
      setPending(false);
    }
  };

  const canSubmit = !pending && /^\d{10}$/.test(nationalCode) && password.length >= 8;

  return (
    <div className="mx-auto my-10 max-w-md animate-fade-up">
      <div className="card p-6 sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <Lock className="h-5 w-5" />
        </div>

        <h1 className="mb-2 text-2xl font-black text-white">ورود به آزمون</h1>
        <p className="mb-5 text-xs leading-6 text-muted">
          برای شرکت در آزمون <b className="text-foreground">{quizTitle}</b> باید با کد ملی
          و رمز عبوری که دبیر برایت ساخته وارد شوی.
        </p>

        {error && (
          <div className="alert alert-error mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs leading-6">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="gate-national-code">
              کد ملی
            </label>
            <input
              id="gate-national-code"
              className="input tabular-nums-fa"
              required
              inputMode="numeric"
              autoComplete="username"
              maxLength={10}
              placeholder="۱۰ رقم بدون خط تیره"
              value={nationalCode}
              onChange={(event) =>
                setNationalCode(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="gate-password">
              رمز عبور
            </label>
            <input
              id="gate-password"
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="رمز داده‌شده توسط دبیر"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ورود...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                ورود و ادامه
              </>
            )}
          </button>
        </form>

        <div className="mt-5 space-y-2 border-t border-hairline pt-4 text-center text-xs leading-6 text-muted">
          <p className="flex items-start justify-center gap-1.5 text-right">
            <KeyRound className="mt-1 h-3.5 w-3.5 shrink-0" />
            <span>
              حساب دانش‌آموز را دبیر می‌سازد؛ اگر کد ملی یا رمز نداری با او تماس بگیر.
            </span>
          </p>
          <Link href="/" className="inline-block text-indigo-300 hover:underline">
            بازگشت به لیست آزمون‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
