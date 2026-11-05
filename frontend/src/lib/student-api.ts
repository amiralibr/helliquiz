/**
 * تایپ‌های مشترک پنل دانش‌آموز و ابزارهای سبک.
 * منطق نشست در `src/lib/auth.ts` و `src/lib/student-session.ts` است.
 */

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

/** پیام خطای فارسی از پاسخ استراپی */
export function extractErrorMessage(
  data: { error?: { message?: string } } | null | undefined,
  fallback: string
): string {
  return data?.error?.message || fallback;
}
