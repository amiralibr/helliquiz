import { cookies } from "next/headers";
import { connection } from "next/server";
import { STRAPI_INTERNAL_URL } from "@/lib/student-api";
import {
  AUTH_COOKIES,
  isTokenUsable,
  refreshAccessToken,
} from "@/lib/auth";
import type { Attempt } from "@/lib/student-api";

const STUDENT = AUTH_COOKIES.student;

export interface StudentProfile {
  documentId: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
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

/**
 * نشست دانش‌آموز را از کوکی‌های httpOnly می‌خواند.
 * اگر توکن دسترسی منقضی شده باشد، با توکن تازه‌سازی در همان درخواست
 * یک توکن جدید می‌گیرد (نوشتن کوکی فقط در Route Handler ممکن است).
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  // این تابع در زمان درخواست اجرا می‌شود (نه در پیش‌رندر)
  await connection();

  const store = await cookies();

  let token = store.get(STUDENT.access)?.value;

  if (!isTokenUsable(token)) {
    const rotated = await refreshAccessToken(
      store.get(STUDENT.refresh)?.value,
      store.get(STUDENT.sig)?.value
    );

    if (!rotated) return null;
    token = rotated.token;
  }

  if (!token) return null;

  try {
    const response = await fetch(`${STRAPI_INTERNAL_URL}/api/student-auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.student) return null;

    return {
      student: data.student,
      attempts: Array.isArray(data.attempts) ? data.attempts : [],
      stats: data.stats || {
        attempts: 0,
        averagePercentage: 0,
        bestPercentage: 0,
        totalTimeSpentSeconds: 0,
      },
    };
  } catch {
    return null;
  }
}
