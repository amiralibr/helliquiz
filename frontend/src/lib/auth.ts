import { STRAPI_INTERNAL_URL } from "@/lib/student-api";

/**
 * مدیریت نشست (دبیر و دانش‌آموز) — فقط سمت سرور.
 *
 * هر دو نقش روی users-permissions استراپی کار می‌کنند، بنابراین:
 *   - توکن دسترسی و توکن تازه‌سازی هر دو در کوکی‌های httpOnly می‌نشینند.
 *   - جاوااسکریپت به هیچ توکنی دسترسی ندارد.
 *   - توکن دسترسی کوتاه‌عمر است و پروکسی آن را شفاف تمدید می‌کند.
 */

export type AuthKind = "teacher" | "student";

export interface AuthCookies {
  access: string;
  refresh: string;
  sig: string;
  user: string;
}

export const AUTH_COOKIES: Record<AuthKind, AuthCookies> = {
  teacher: {
    access: "hq_teacher_access",
    refresh: "hq_teacher_refresh",
    sig: "hq_teacher_refresh_sig",
    user: "hq_teacher_user",
  },
  student: {
    access: "hq_student_access",
    refresh: "hq_student_refresh",
    sig: "hq_student_refresh_sig",
    user: "hq_student_user",
  },
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 6,
  secure: IS_PRODUCTION,
};

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: IS_PRODUCTION,
};

export const userCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: IS_PRODUCTION,
};

export interface SignedInUser {
  id?: number;
  documentId?: string;
  username?: string;
  email?: string;
  fullName?: string;
  studentClass?: string;
  nationalCode?: string;
}

export interface AuthTokens {
  token: string;
  refresh?: string;
  sig?: string;
  user: SignedInUser;
}

/** کوکی‌های تازه‌سازی امضاشده‌ی Strapi را از پاسخ استخراج می‌کند */
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

/** آیا توکن دسترسی هنوز قابل استفاده است؟ (ناقص یا منقضی = خیر) */
export function isTokenUsable(token?: string | null): boolean {
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
export async function refreshAccessToken(
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

    return { token: data.jwt, refresh: rotated.value, sig: rotated.sig };
  } catch {
    return null;
  }
}

/**
 * ورود با users-permissions استراپی.
 * شناسه می‌تواند نام کاربری (برای دانش‌آموز: کد ملی) یا ایمیل باشد.
 */
export async function signIn(
  identifier: string,
  password: string
): Promise<{ ok: true; tokens: AuthTokens } | { ok: false; status: number; message: string }> {
  let response: Response;

  try {
    response = await fetch(`${STRAPI_INTERNAL_URL}/api/auth/local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 503,
      message: "ارتباط با سرور آزمون برقرار نشد. دوباره تلاش کنید.",
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data?.jwt !== "string" || !data.jwt) {
    return {
      ok: false,
      status: response.ok ? 401 : response.status,
      message:
        data?.error?.message || "نام کاربری یا رمز عبور اشتباه است.",
    };
  }

  const refresh = extractStrapiRefreshCookies(response.headers);

  return {
    ok: true,
    tokens: {
      token: data.jwt,
      refresh: refresh.value,
      sig: refresh.sig,
      user: data.user ?? {},
    },
  };
}
