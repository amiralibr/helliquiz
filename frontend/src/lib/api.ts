import { Quiz, SubmissionPayload, SubmissionResponse } from "@/types/quiz";

// استراپی فقط روی IPv4 گوش می‌دهد؛ از 127.0.0.1 استفاده می‌کنیم تا
// رزولوشن IPv6-first برای localhost باعث Failed to fetch نشود.
const STRAPI_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://127.0.0.1:1337";

export async function getQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${STRAPI_BASE_URL}/api/quizzes?populate=*`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("خطا در دریافت لیست آزمون‌ها از سرور");
  }

  const json = await res.json();
  return json.data || [];
}

export async function getQuizById(id: string | number): Promise<Quiz | null> {
  const res = await fetch(
    `${STRAPI_BASE_URL}/api/quizzes/${id}?populate[questions][populate]=*`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("خطا در دریافت مشخصات آزمون");
  }

  const json = await res.json();
  return json.data || null;
}

// ساختار کامل پی‌لود ارسالی دانش‌آموز
export interface SubmitQuizPayload {
  studentName: string;
  studentClass: string;
  nationalCode: string;
  timeSpentSeconds: number;
  answers: Record<string | number, string | number>;
}

export async function submitQuizAnswers(quizId: string | number, payload: {
  studentName: string;
  studentClass: string;
  nationalCode: string;
  timeSpentSeconds: number;
  answers: Record<string | number, number | string>;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337'}/api/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8', // جلوگیری از علامت سؤال شدن فونت فارسی
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'خطا در ثبت نهایی آزمون');
  }

  return await res.json();
}

