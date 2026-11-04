import { STRAPI_INTERNAL_URL } from "@/lib/student-api";

/**
 * نشست دبیر کاملاً سمت سرور مدیریت می‌شود: توکن دسترسی و توکن تازه‌سازی
 * در کوکی‌های httpOnly می‌مانند و هرگز در دسترس جاوااسکریپت نیستند.
 */

export const TEACHER_ACCESS_COOKIE = "hq_teacher_access";
export const TEACHER_REFRESH_COOKIE = "hq_teacher_refresh";
export const TEACHER_REFRESH_SIG_COOKIE = "hq_teacher_refresh_sig";
export const TEACHER_USER_COOKIE = "hq_teacher_user";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** عمر توکن دسترسی کوتاه است (Strapi به‌صورت پیش‌فرض ۱۰ دقیقه) */
export const teacherAccessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 6,
  secure: IS_PRODUCTION,
};

/** توکن تازه‌سازی ۳۰ روز زنده می‌ماند */
export const teacherRefreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: IS_PRODUCTION,
};

export const teacherUserCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: IS_PRODUCTION,
};

export interface TeacherProfile {
  username?: string;
  email?: string;
}

/** کوکی‌های تازه‌سازی امضاشده‌ی Strapi را از پاسخ ورود استخراج می‌کند */
export function extractStrapiRefreshCookies(headers: Headers): {
  value?: string;
  sig?: string;
} {
  const result: { value?: string; sig?: string } = {};

  const setCookies =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];

  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index === -1) continue;

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();

    if (name === "strapi_up_refresh") result.value = value;
    if (name === "strapi_up_refresh.sig") result.sig = value;
  }

  return result;
}

/**
 * آیا توکن دسترسی هنوز قابل استفاده است؟
 * (توکن‌های ناقص یا منقضی پیش از ارسال تازه‌سازی می‌شوند)
 */
export function isTeacherTokenUsable(token?: string | null): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { exp?: number };

    if (typeof payload.exp !== "number") return true;

    // ۵ ثانیه حاشیه برای اختلاف ساعت
    return payload.exp * 1000 > Date.now() + 5_000;
  } catch {
    return false;
  }
}

/** با توکن تازه‌سازی، یک توکن دسترسی جدید می‌گیرد */
export async function refreshTeacherAccessToken(
  refresh?: string | null,
  sig?: string | null
): Promise<{ token: string; refresh?: string; sig?: string } | null> {
  if (!refresh || !sig) return null;

  try {
    const response = await fetch(`${STRAPI_INTERNAL_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        cookie: `strapi_up_refresh=${refresh}; strapi_up_refresh.sig=${sig}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as { jwt?: string } | null;
    if (!data?.jwt) return null;

    const rotated = extractStrapiRefreshCookies(response.headers);

    return {
      token: data.jwt,
      refresh: rotated.value,
      sig: rotated.sig,
    };
  } catch {
    return null;
  }
}
