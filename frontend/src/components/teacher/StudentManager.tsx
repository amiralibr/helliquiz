"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";

/**
 * مدیریت دانش‌آموزان از پنل دبیر.
 *
 * دبیر حساب دانش‌آموز را می‌سازد (نام، کلاس، کد ملی، رمز) و دانش‌آموز
 * دقیقاً با همان کد ملی و رمز در `/student` وارد می‌شود. همه‌ی درخواست‌ها
 * از مسیر نسبی `/api/strapi` و با نشست کوکیِ دبیر پروکسی می‌شوند.
 */

const API_BASE = "/api/strapi";

interface StudentAccount {
  id: number;
  documentId: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
  blocked: boolean;
  createdAt?: string;
  attempts: number;
}

interface StudentManagerProps {
  /** برای نمایش تعداد در برچسب تب */
  onCountChange?: (count: number) => void;
  /** پیام تازه برای هدر پنل (اختیاری) */
  onNotice?: (message: string) => void;
}

type Mode = "create" | "edit";

const NATIONAL_CODE_PATTERN = /^\d{10}$/;
const MIN_PASSWORD_LENGTH = 8;

const faNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

const faDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
};

/** رمز پیشنهادی خوانا (بدون نویسه‌های گیج‌کننده) */
const suggestPassword = () => {
  const alphabet = "abcdefghjkmnprstuvwxyz23456789";
  let out = "";
  for (let index = 0; index < 10; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

const readError = async (response: Response) => {
  const data = await response.json().catch(() => null);
  return (
    (data?.error?.message as string | undefined) ||
    "عملیات انجام نشد. دوباره تلاش کنید."
  );
};

export default function StudentManager({
  onCountChange,
  onNotice,
}: StudentManagerProps) {
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // مودال ساخت/ویرایش
  const [mode, setMode] = useState<Mode | null>(null);
  const [editing, setEditing] = useState<StudentAccount | null>(null);
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // دانش‌آموزِ تازه‌ساخته‌شده (برای نمایش کد ملی و رمز به دبیر)
  const [created, setCreated] = useState<{
    fullName: string;
    nationalCode: string;
    password: string;
  } | null>(null);

  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/teacher-students`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const data = await response.json();
        const list: StudentAccount[] = Array.isArray(data?.data) ? data.data : [];

        setStudents(list);
        setError(null);
        onCountChange?.(list.length);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "دریافت فهرست دانش‌آموزان ناموفق بود."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onCountChange]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
    // فقط یک بار در زمان نصب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setFullName("");
    setStudentClass("");
    setNationalCode("");
    setPassword(suggestPassword());
    setShowPassword(true);
    setFormError(null);
  };

  const openEdit = (student: StudentAccount) => {
    setMode("edit");
    setEditing(student);
    setFullName(student.fullName);
    setStudentClass(student.studentClass);
    setNationalCode(student.nationalCode);
    setPassword("");
    setShowPassword(false);
    setFormError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setMode(null);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (fullName.trim().length < 3) {
      setFormError("نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.");
      return;
    }
    if (studentClass.trim().length < 1) {
      setFormError("کلاس / پایه را وارد کنید.");
      return;
    }
    if (!NATIONAL_CODE_PATTERN.test(nationalCode.trim())) {
      setFormError("کد ملی باید دقیقاً ۱۰ رقم باشد.");
      return;
    }
    if (mode === "create" && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`رمز عبور باید دست‌کم ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      return;
    }
    if (mode === "edit" && password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`رمز جدید باید دست‌کم ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
      return;
    }

    setSaving(true);

    try {
      const isCreate = mode === "create";
      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        studentClass: studentClass.trim(),
        nationalCode: nationalCode.trim(),
      };

      if (password.length > 0) payload.password = password;

      const response = await fetch(
        isCreate ? `${API_BASE}/teacher-students` : `${API_BASE}/teacher-students/${editing?.id}`,
        {
          method: isCreate ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      const student: StudentAccount | undefined = data?.data;

      if (isCreate && student) {
        setCreated({
          fullName: student.fullName,
          nationalCode: student.nationalCode,
          password,
        });
        setSuccess(`حساب «${student.fullName}» ساخته شد.`);
        onNotice?.(`دانش‌آموز «${student.fullName}» ساخته شد.`);
      } else {
        setSuccess("تغییرات ذخیره شد.");
      }

      setMode(null);
      setEditing(null);
      await load(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "ذخیره‌سازی ناموفق بود.");
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (student: StudentAccount) => {
    setPendingId(student.id);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/teacher-students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !student.blocked }),
      });

      if (!response.ok) throw new Error(await readError(response));

      setSuccess(
        student.blocked
          ? `دسترسی «${student.fullName}» فعال شد.`
          : `دسترسی «${student.fullName}» مسدود شد.`
      );
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر وضعیت ناموفق بود.");
    } finally {
      setPendingId(null);
    }
  };

  const removeStudent = async (student: StudentAccount) => {
    const confirmed = window.confirm(
      `حساب «${student.fullName}» (${student.nationalCode}) حذف شود؟\n` +
        "کارنامه‌های همین دانش‌آموز هم پاک می‌شوند و قابل بازگشت نیست."
    );
    if (!confirmed) return;

    setPendingId(student.id);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/teacher-students/${student.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(await readError(response));

      setSuccess(`حساب «${student.fullName}» حذف شد.`);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف ناموفق بود.");
    } finally {
      setPendingId(null);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const text = `کد ملی: ${created.nationalCode}\nرمز عبور: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("کد ملی و رمز کپی شد؛ می‌توانید به دانش‌آموز بدهید.");
    } catch {
      setError("کپی خودکار ممکن نشد؛ متن را دستی بردارید.");
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;

    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(term) ||
        student.studentClass.toLowerCase().includes(term) ||
        student.nationalCode.includes(term)
    );
  }, [students, query]);

  const blockedCount = students.filter((student) => student.blocked).length;

  return (
    <div className="space-y-5">
      {/* ---------- سربرگ بخش ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Users className="h-5 w-5 text-indigo-300" />
            دانش‌آموزان کلاس
          </h2>
          <p className="mt-1 text-xs text-muted">
            حساب بسازید تا دانش‌آموز با <b>کد ملی</b> و <b>همین رمز</b> در پنل
            دانش‌آموز وارد شود و آزمون بدهد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="btn btn-ghost btn-sm"
            title="به‌روزرسانی فهرست"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>به‌روزرسانی</span>
          </button>

          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <UserRoundPlus className="h-4 w-4" />
            <span>افزودن دانش‌آموز</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ---------- کارت رمزِ حساب تازه ---------- */}
      {created && (
        <div className="card border-indigo-500/40 bg-indigo-500/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  حساب {created.fullName} آماده است
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span>
                    کد ملی:{" "}
                    <b className="font-mono text-emerald-300">{created.nationalCode}</b>
                  </span>
                  <span>
                    رمز عبور:{" "}
                    <b className="font-mono text-emerald-300">{created.password}</b>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={copyCredentials} className="btn btn-ghost btn-sm">
                <Copy className="h-4 w-4" />
                <span>کپی</span>
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="btn btn-ghost btn-sm"
                title="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- آمار و جستجو ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="badge">
            <Users className="h-3 w-3" />
            {faNumber(students.length)} دانش‌آموز
          </span>
          {blockedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300">
              <ShieldOff className="h-3 w-3" />
              {faNumber(blockedCount)} مسدود
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 -translate-y-1/2 text-faint" />
          <label className="label" htmlFor="student-search">
            جستجو
          </label>
          <input
            id="student-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام، کلاس یا کد ملی…"
            className="input pr-9"
          />
        </div>
      </div>

      {/* ---------- جدول ---------- */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((row) => (
              <div key={row} className="skeleton h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-faint" />
            <p className="text-sm font-medium text-muted">
              {students.length === 0
                ? "هنوز دانش‌آموزی ثبت نشده است."
                : "دانش‌آموزی با این جستجو پیدا نشد."}
            </p>
            {students.length === 0 && (
              <button
                type="button"
                onClick={openCreate}
                className="btn btn-primary btn-sm mt-4"
              >
                <Plus className="h-4 w-4" />
                <span>اولین دانش‌آموز را بسازید</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="text-xs">
                <tr>
                  <th className="px-4 py-3.5">نام دانش‌آموز</th>
                  <th className="px-4 py-3.5">کلاس</th>
                  <th className="px-4 py-3.5">کد ملی</th>
                  <th className="px-4 py-3.5 text-center">کارنامه</th>
                  <th className="px-4 py-3.5">تاریخ ثبت</th>
                  <th className="px-4 py-3.5 text-center">وضعیت</th>
                  <th className="px-4 py-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => {
                  const busy = pendingId === student.id;

                  return (
                    <tr key={student.id}>
                      <td className="px-4 py-3.5 font-bold text-white">
                        {student.fullName}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-indigo-300">
                        {student.studentClass}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted">
                        {student.nationalCode}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs tabular-nums-fa">
                        {faNumber(student.attempts)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted tabular-nums-fa">
                        {faDate(student.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {student.blocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300">
                            <ShieldOff className="h-3 w-3" />
                            مسدود
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            <ShieldCheck className="h-3 w-3" />
                            فعال
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(student)}
                            className="icon-btn icon-btn-warning"
                            title="ویرایش مشخصات و تغییر رمز"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleBlock(student)}
                            className="icon-btn disabled:opacity-50"
                            title={student.blocked ? "فعال‌کردن دسترسی" : "مسدودسازی"}
                          >
                            {student.blocked ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <ShieldOff className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeStudent(student)}
                            className="icon-btn icon-btn-danger disabled:opacity-50"
                            title="حذف حساب و کارنامه‌ها"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-faint">
        دانش‌آموز از صفحه‌ی «پنل دانش‌آموز» با کد ملی و رمزی که اینجا می‌گذارید
        وارد می‌شود؛ هر آزمون هم فقط یک بار برای هر کد ملی ثبت می‌شود.
      </p>

      {/* ---------- مودال ساخت/ویرایش ---------- */}
      {mode && (
        <div className="modal-overlay">
          <div className="modal-panel max-h-[90dvh] max-w-lg overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-lg font-bold">
                {mode === "create" ? "دانش‌آموز جدید" : "ویرایش دانش‌آموز"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="student-fullname">
                  نام و نام خانوادگی
                </label>
                <input
                  id="student-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="input"
                  placeholder="مثلاً سارا احمدی"
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="student-class">
                    کلاس / پایه
                  </label>
                  <input
                    id="student-class"
                    type="text"
                    required
                    value={studentClass}
                    onChange={(event) => setStudentClass(event.target.value)}
                    className="input"
                    placeholder="نهم ۲"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="student-national-code">
                    کد ملی (نام کاربری)
                  </label>
                  <input
                    id="student-national-code"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={nationalCode}
                    onChange={(event) =>
                      setNationalCode(event.target.value.replace(/\D/g, ""))
                    }
                    className="input tabular-nums-fa"
                    placeholder="۱۰ رقم"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="student-password">
                  {mode === "create" ? "رمز عبور" : "رمز عبور جدید (اختیاری)"}
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="student-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="input pl-10 font-mono"
                      placeholder={
                        mode === "create"
                          ? "دست‌کم ۸ نویسه"
                          : "برای تغییر رمز پر کنید"
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-indigo-300"
                      title={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPassword(suggestPassword());
                      setShowPassword(true);
                    }}
                    className="btn btn-ghost btn-sm whitespace-nowrap"
                    title="ساخت رمز تصادفی"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>پیشنهاد رمز</span>
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-faint">
                  همین رمز را به دانش‌آموز بدهید؛ بعداً هم می‌توانید از همین
                  پنجره عوضش کنید.
                </p>
              </div>

              {formError && (
                <div className="alert alert-error">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-hairline pt-3">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  انصراف
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{mode === "create" ? "ساخت حساب" : "ذخیره تغییرات"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
