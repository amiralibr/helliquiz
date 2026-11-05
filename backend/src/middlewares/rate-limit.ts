/**
 * محدودکننده‌ی نرخ درخواست (Rate Limit) — در حافظه و بدون وابستگی خارجی.
 *
 * مسیرهای حساس (ورود، ثبت‌نام، تصحیح آزمون) سقف بسیار کمتری دارند تا
 * جلوی حمله‌ی حدس رمز و ارسال انبوه کارنامه گرفته شود.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 300;
const AUTH_MAX = 10;
const SUBMIT_MAX = 20;

// فقط مسیرهای ورود/ثبت‌نام سقف سخت‌گیرانه دارند؛ خواندن نشست (/me) سقف عمومی دارد
const AUTH_PREFIXES = ['/api/auth/local'];
const SUBMIT_ROUTE = /^\/api\/quizzes\/[^/]+\/submit\/?$/;

const createLimiter = (windowMs: number, max: number) => {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  // نباید فرآیند Node را زنده نگه دارد
  if (typeof sweep.unref === 'function') sweep.unref();

  return (key: string) => {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    return {
      limited: bucket.count > max,
      remaining: Math.max(0, max - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  };
};

export default (config: any) => {
  const windowMs = Number(config?.windowMs) > 0 ? Number(config.windowMs) : DEFAULT_WINDOW_MS;
  const generalMax = Number(config?.max) > 0 ? Number(config.max) : DEFAULT_MAX;

  const generalLimiter = createLimiter(windowMs, generalMax);
  const authLimiter = createLimiter(windowMs, AUTH_MAX);
  const submitLimiter = createLimiter(windowMs, SUBMIT_MAX);

  const clientKey = (ctx: any) => {
    const forwarded = ctx.request.header['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
      ctx.request.ip ||
      'unknown';
    return `${ip}`;
  };

  return async (ctx: any, next: () => Promise<void>) => {
    const path = ctx.request.path || '';

    // مسیرهای مدیریتی و فایل‌های استاتیک سقف عمومی ندارند
    if (!path.startsWith('/api/')) {
      return next();
    }

    let limiter = generalLimiter;
    if (AUTH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      limiter = authLimiter;
    } else if (SUBMIT_ROUTE.test(path)) {
      limiter = submitLimiter;
    }

    const verdict = limiter(clientKey(ctx));

    ctx.set('X-RateLimit-Remaining', String(verdict.remaining));

    if (verdict.limited) {
      ctx.set('Retry-After', String(verdict.retryAfterSeconds));
      ctx.status = 429;
      ctx.body = {
        error: {
          status: 429,
          name: 'TooManyRequests',
          message: `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${verdict.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
        },
      };
      return;
    }

    // بدنه‌ی درخواست‌های عمومی محدود می‌شود تا ارسال payload حجیم ممکن نباشد
    await next();
  };
};
