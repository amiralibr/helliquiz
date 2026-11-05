import { NextRequest, NextResponse } from "next/server";
import { STRAPI_INTERNAL_URL } from "@/lib/student-api";
import {
  AUTH_COOKIES,
  accessCookieOptions,
  refreshCookieOptions,
  signIn,
  userCookieOptions,
} from "@/lib/auth";

const STUDENT = AUTH_COOKIES.student;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const nationalCode =
    typeof body?.nationalCode === "string" ? body.nationalCode.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // ۱) ساخت حساب در users-permissions
  let created: Response;

  try {
    created = await fetch(`${STRAPI_INTERNAL_URL}/api/student-auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: body?.fullName,
        studentClass: body?.studentClass,
        nationalCode,
        password,
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: { message: "ارتباط با سرور آزمون برقرار نشد. دوباره تلاش کنید." } },
      { status: 503 }
    );
  }

  const createdData = await created.json().catch(() => ({}));

  if (!created.ok) {
    return NextResponse.json(
      {
        error: {
          message:
            createdData?.error?.message ||
            "ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.",
        },
      },
      { status: created.status }
    );
  }

  // ۲) ورود خودکار و ساخت نشست (توکن در کوکی httpOnly)
  const result = await signIn(nationalCode, password);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          message:
            "حساب ساخته شد اما ورود خودکار انجام نشد. از فرم ورود استفاده کنید.",
        },
      },
      { status: 401 }
    );
  }

  const { user, token, refresh, sig } = result.tokens;

  const profile = {
    documentId: user.documentId ?? createdData?.user?.documentId,
    fullName: user.fullName || user.username || body?.fullName,
    studentClass: user.studentClass || body?.studentClass || "-",
    nationalCode: user.nationalCode || nationalCode,
  };

  const response = NextResponse.json({ student: profile });

  response.cookies.set(STUDENT.access, token, accessCookieOptions);
  response.cookies.set(STUDENT.user, JSON.stringify(profile), userCookieOptions);

  if (refresh && sig) {
    response.cookies.set(STUDENT.refresh, refresh, refreshCookieOptions);
    response.cookies.set(STUDENT.sig, sig, refreshCookieOptions);
  }

  return response;
}
