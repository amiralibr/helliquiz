import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  TEACHER_ACCESS_COOKIE,
  TEACHER_REFRESH_COOKIE,
  TEACHER_REFRESH_SIG_COOKIE,
  TEACHER_USER_COOKIE,
  isTeacherTokenUsable,
  type TeacherProfile,
} from "@/lib/teacher-api";

/** وضعیت نشست دبیر را برمی‌گرداند (توکن‌ها را افشا نمی‌کند) */
export async function GET() {
  const store = await cookies();

  const accessToken = store.get(TEACHER_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(TEACHER_REFRESH_COOKIE)?.value;
  const refreshSig = store.get(TEACHER_REFRESH_SIG_COOKIE)?.value;

  // توکن دسترسی معتبر است، یا امکان تازه‌سازی وجود دارد
  const canRefresh = Boolean(refreshToken && refreshSig);

  if (!isTeacherTokenUsable(accessToken) && !canRefresh) {
    return NextResponse.json(
      { error: { message: "نشست فعالی وجود ندارد." } },
      { status: 401 }
    );
  }

  let user: TeacherProfile = {};
  const rawUser = store.get(TEACHER_USER_COOKIE)?.value;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as TeacherProfile;
    } catch {
      user = {};
    }
  }

  return NextResponse.json(
    { user },
    { headers: { "cache-control": "no-store" } }
  );
}
