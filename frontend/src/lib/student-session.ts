import { cookies } from "next/headers";
import {
  STUDENT_COOKIE_NAME,
  StudentSession,
  requestStudentApi,
} from "@/lib/student-api";

/**
 * نشست دانش‌آموز را از کوکی httpOnly می‌خواند و پروفایل + کارنامه‌ها را
 * از سرور استراپی می‌گیرد. فقط در Server Component و Route Handler قابل استفاده است.
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE_NAME)?.value;

  if (!token) return null;

  const { ok, data } = await requestStudentApi("me", { token, method: "GET" });

  if (!ok || !data?.student) return null;

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
}
