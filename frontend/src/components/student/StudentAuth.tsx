"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  AlertCircle,
  Loader2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  KeyRound,
} from "lucide-react";

const NATIONAL_CODE_PATTERN = /^\d{10}$/;

/**
 * فرم ورود دانش‌آموز.
 *
 * ثبت‌نام وجود ندارد؛ حساب دانش‌آموز را دبیر از پنل خودش می‌سازد و
 * کد ملی + رمز را به دانش‌آموز می‌دهد.
 */
export default function StudentAuth() {
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

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای نامشخص");
      setPending(false);
    }
  };

  const canSubmit = !pending && NATIONAL_CODE_PATTERN.test(nationalCode) && password.length >= 8;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-6 lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- معرفی ---------- */}
      <section className="card animate-fade-up hidden flex-col justify-between p-8 lg:flex">
        <div>
          <div className="badge mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>پنل دانش‌آموز</span>
          </div>
          <h1 className="mb-3 text-3xl font-black leading-tight text-white">
            کارنامه‌ات را
            <br />
            <span className="text-gradient">همیشه همراه داشته باش</span>
          </h1>
          <p className="mb-8 text-sm leading-7 text-muted">
            با ورود به پنل، همه‌ی آزمون‌هایی که داده‌ای را یک‌جا می‌بینی: نمره، درصد،
            زمان صرف‌شده و پاسخ‌نامه‌ی تفکیکی هر سؤال با مشخص‌کردن گزینه‌ی درست و غلط.
          </p>
        </div>

        <ul className="space-y-3 text-xs text-muted">
          <li className="flex items-start gap-2">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
            <span>
              حساب شما را <b className="text-foreground">دبیر</b> می‌سازد؛ کد ملی و رمز
              عبور را از او بگیرید. ثبت‌نام شخصی وجود ندارد.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>کارنامه‌های شما خصوصی است و فقط با کد ملی و رمز عبور خودتان دیده می‌شود.</span>
          </li>
          <li className="flex items-start gap-2">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
            <span>هر آزمون فقط یک بار قابل ثبت است؛ نتیجه به‌صورت خودکار در پنل ذخیره می‌شود.</span>
          </li>
        </ul>
      </section>

      {/* ---------- فرم ---------- */}
      <section className="card animate-fade-up p-6 sm:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <LogIn className="h-5 w-5" />
        </div>

        <h2 className="mb-1 text-lg font-bold text-white">ورود به پنل دانش‌آموزی</h2>
        <p className="mb-5 text-xs leading-6 text-muted">
          با کد ملی و رمز عبوری که دبیر برای شما ساخته است وارد شوید.
        </p>

        {error && (
          <div className="alert alert-error mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs leading-6">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="national-code">
              کد ملی
            </label>
            <input
              id="national-code"
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
            <label className="label" htmlFor="password">
              رمز عبور
            </label>
            <input
              id="password"
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
                ورود به پنل
              </>
            )}
          </button>
        </form>

        <div className="mt-5 space-y-2 border-t border-hairline pt-4 text-center text-xs leading-6 text-muted">
          <p>
            حساب نداری یا رمزت را فراموش کرده‌ای؟ به دبیر خود اطلاع بده تا برایت حساب
            بسازد یا رمز را عوض کند.
          </p>
          <Link href="/" className="inline-block text-indigo-300 hover:underline">
            بازگشت به لیست آزمون‌ها
          </Link>
        </div>
      </section>
    </div>
  );
}
