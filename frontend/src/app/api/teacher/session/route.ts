import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, isTokenUsable, type SignedInUser } from "@/lib/auth";

const TEACHER = AUTH_COOKIES.teacher;

/** وضعیت نشست دبیر را برمی‌گرداند (توکن‌ها را افشا نمی‌کند) */
export async function GET() {
  const store = await cookies();

  const accessToken = store.get(TEACHER.access)?.value;
  const refreshToken = store.get(TEACHER.refresh)?.value;
  const refreshSig = store.get(TEACHER.sig)?.value;

  // توکن دسترسی معتبر است، یا امکان تازه‌سازی وجود دارد
  const canRefresh = Boolean(refreshToken && refreshSig);

  if (!isTokenUsable(accessToken) && !canRefresh) {
    return NextResponse.json(
      { error: { message: "نشست فعالی وجود ندارد." } },
      { status: 401 }
    );
  }

  let user: SignedInUser = {};
  const rawUser = store.get(TEACHER.user)?.value;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as SignedInUser;
    } catch {
      user = {};
    }
  }

  return NextResponse.json(
    { user },
    { headers: { "cache-control": "no-store" } }
  );
}
