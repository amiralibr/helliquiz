import { NextRequest, NextResponse } from "next/server";
import { STUDENT_COOKIE_NAME } from "@/lib/student-api";

/**
 * پروکسی سمت سرور به استراپی.
 *
 * مرورگر هرگز مستقیماً با Strapi صحبت نمی‌کند (نه localhost و نه 127.0.0.1)؛
 * همه‌ی درخواست‌ها به همین مسیر نسبی می‌آیند و از سمت سرور Next.js به
 * آدرس داخلی استراپی منتقل می‌شوند.
 */

const STRAPI_INTERNAL_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://127.0.0.1:1337";

const FORWARDED_HEADERS = ["authorization", "content-type", "accept"];

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  const targetUrl = `${STRAPI_INTERNAL_URL}/api/${path
    .map((segment) => encodeURIComponent(segment))
    .join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const header of FORWARDED_HEADERS) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");

  // IP واقعی مرورگر را منتقل می‌کنیم تا محدودیت نرخ در بک‌اند
  // بین همه کاربرانِ پشت این پروکسی مشترک نشود.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  // اگر دانش‌آموز وارد شده باشد، توکنِ داخل کوکی httpOnly به‌صورت Bearer
  // منتقل می‌شود تا هویت از حساب خوانده شود، نه از ورودی کاربر.
  if (!headers.has("authorization")) {
    const studentToken = request.cookies.get(STUDENT_COOKIE_NAME)?.value;
    if (studentToken) headers.set("authorization", `Bearer ${studentToken}`);
  }

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD", "OPTIONS"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const payload = await upstream.text();

    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          status: 503,
          name: "ServiceUnavailable",
          message:
            "ارتباط با سرور آزمون برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.",
        },
      },
      { status: 503 }
    );
  }
}


export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
