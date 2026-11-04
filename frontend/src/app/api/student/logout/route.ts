import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth";

const STUDENT = AUTH_COOKIES.student;

export async function POST() {
  const response = NextResponse.json({ ok: true });

  for (const name of [STUDENT.access, STUDENT.user, STUDENT.refresh, STUDENT.sig]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
