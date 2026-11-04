import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth";

const TEACHER = AUTH_COOKIES.teacher;

export async function POST() {
  const response = NextResponse.json({ ok: true });

  for (const name of [TEACHER.access, TEACHER.user, TEACHER.refresh, TEACHER.sig]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
