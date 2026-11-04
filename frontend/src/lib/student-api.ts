/**
 * پل ارتباطی سمت سرور با مسیرهای حساب دانش‌آموز در استراپی.
 * توکن دانش‌آموز فقط داخل کوکی httpOnly می‌ماند و در دسترس جاوااسکریپت نیست.
 */

export const STUDENT_COOKIE_NAME = "helliquiz_student";
export const STUDENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // ۳۰ روز

export const STRAPI_INTERNAL_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://127.0.0.1:1337";

export interface StudentProfile {
  documentId: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
}

export interface AttemptDetail {
  questionText: string;
  options?: string[];
  selectedOption: number | null;
  correctAnswer: number | null;
  isCorrect: boolean;
  weight?: number;
}

export interface Attempt {
  documentId: string;
  createdAt: string;
  timeSpentSeconds: number;
  score: number;
  totalScore: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  quiz: {
    documentId: string | null;
    title: string;
    durationMinutes: number | null;
  };
  details: AttemptDetail[];
}

export interface StudentSession {
  student: StudentProfile;
  attempts: Attempt[];
  stats: {
    attempts: number;
    averagePercentage: number;
    bestPercentage: number;
    totalTimeSpentSeconds: number;
  };
}

/** ساختار پاسخ مسیرهای حساب دانش‌آموز */
export interface StudentApiData {
  student?: StudentProfile;
  token?: string;
  attempts?: Attempt[];
  stats?: StudentSession["stats"];
  error?: {
    message?: string;
    details?: { errors?: Array<{ message?: string }> };
  };
  message?: string;
}

/** پاسخ خام استراپی را به‌صورت امن به تایپ‌های سمت کلاینت تبدیل می‌کند */
export async function requestStudentApi(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<{ ok: boolean; status: number; data: StudentApiData }> {
  const { token, headers, ...rest } = init;

  try {
    const response = await fetch(`${STRAPI_INTERNAL_URL}/api/student-auth/${path}`, {
      ...rest,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string>),
      },
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as StudentApiData;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 503,
      data: {
        error: {
          message: "ارتباط با سرور آزمون برقرار نشد. لطفاً دوباره تلاش کنید.",
        },
      },
    };
  }
}

/** پیام خطای فارسی از پاسخ استراپی */
export function extractErrorMessage(data: StudentApiData, fallback: string): string {
  return (
    data?.error?.message ||
    data?.message ||
    (Array.isArray(data?.error?.details?.errors) &&
      data.error.details.errors[0]?.message) ||
    fallback
  );
}
