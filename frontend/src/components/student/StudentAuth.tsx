"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Mode = "login" | "register";

const NATIONAL_CODE_PATTERN = /^\d{10}$/;

export default function StudentAuth() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [nationalCode, setNationalCode] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const endpoint = mode === "login" ? "/api/student/login" : "/api/student/register";
      const payload =
        mode === "login"
          ? { nationalCode, password }
          : { fullName, studentClass, nationalCode, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message || "عملیات انجام نشد. اطلاعات را بررسی کنید."
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای نامشخص");
      setPending(false);
    }
  };

  const isLogin = mode === "login";
  const canSubmit =
    !pending &&
    NATIONAL_CODE_PATTERN.test(nationalCode) &&
    password.length >= 8 &&
    (isLogin || (fullName.trim().length >= 3 && studentClass.trim().length >= 1));

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
        <div className="mb-6 flex rounded-xl border border-hairline bg-background/40 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
              isLogin
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-muted hover:text-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            ورود
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
              !isLogin
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-muted hover:text-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            ثبت‌نام
          </button>
        </div>

        <h2 className="mb-1 text-lg font-bold text-white">
          {isLogin ? "ورود به پنل دانش‌آموزی" : "ساخت حساب دانش‌آموزی"}
        </h2>
        <p className="mb-5 text-xs text-muted">
          {isLogin
            ? "با کد ملی و رمز عبوری که هنگام ثبت‌نام انتخاب کرده‌اید وارد شوید."
            : "با کد ملی خود ثبت‌نام کنید تا نتیجه‌ی آزمون‌هایتان در پنل ذخیره شود."}
        </p>

        {error && (
          <div className="alert alert-error mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs leading-6">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="label" htmlFor="full-name">
                  نام و نام خانوادگی
                </label>
                <input
                  id="full-name"
                  className="input"
                  required
                  minLength={3}
                  placeholder="مثال: امیرعلی برخورداری"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="student-class">
                  کلاس / پایه
                </label>
                <input
                  id="student-class"
                  className="input"
                  required
                  placeholder="مثال: نهم ۱"
                  value={studentClass}
                  onChange={(event) => setStudentClass(event.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="national-code">
              کد ملی
            </label>
            <input
              id="national-code"
              className="input tabular-nums-fa"
              required
              inputMode="numeric"
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
              placeholder="حداقل ۸ نویسه"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال پردازش...
              </>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" />
                ورود به پنل
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                ساخت حساب و ورود
              </>
            )}
          </button>
        </form>

        <div className="mt-5 space-y-2 border-t border-hairline pt-4 text-center text-xs text-muted">
          <p>
            برای شرکت در آزمون جدید نیازی به ورود نیست، اما با ورود، کارنامه‌ات
            ذخیره می‌شود.
          </p>
          <Link href="/" className="inline-block text-indigo-300 hover:underline">
            بازگشت به لیست آزمون‌ها
          </Link>
        </div>
      </section>
    </div>
  );
}
