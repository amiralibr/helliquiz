import crypto from 'node:crypto';
import { factories } from '@strapi/strapi';

const SCRYPT_KEY_LENGTH = 64;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // ۳۰ روز

/** کلید امضای توکن دانش‌آموز (از env و در نبود آن از APP_KEYS) */
const getSecret = (): string => {
  const fromEnv = process.env.STUDENT_TOKEN_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  const appKeys = (process.env.APP_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

  if (appKeys.length > 0) return appKeys[0];

  return 'helliquiz-development-secret';
};

const toBase64Url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

const signPayload = (payload: string): string =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

export interface StudentTokenPayload {
  /** شناسه سند دانش‌آموز */
  sid: string;
  /** کد ملی */
  nc: string;
  /** زمان انقضای توکن (ثانیه) */
  exp: number;
}

export default factories.createCoreService('api::student.student', ({ strapi }) => ({
  /** ساخت هش امن با scrypt + نمک تصادفی */
  hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
    return { hash, salt };
  },

  /** مقایسه‌ی زمان-ثابت رمز عبور با هش ذخیره‌شده */
  verifyPassword(password: string, hash?: string | null, salt?: string | null): boolean {
    if (!hash || !salt) return false;
    try {
      const candidate = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH);
      const expected = Buffer.from(hash, 'hex');
      if (candidate.length !== expected.length) return false;
      return crypto.timingSafeEqual(candidate, expected);
    } catch {
      return false;
    }
  },

  /** صدور توکن امضاشده (HMAC-SHA256) */
  issueToken(student: { documentId?: string; id?: number | string; nationalCode: string }): string {
    const payload: StudentTokenPayload = {
      sid: String(student.documentId || student.id),
      nc: student.nationalCode,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    };
    const encoded = toBase64Url(JSON.stringify(payload));
    return `${encoded}.${signPayload(encoded)}`;
  },

  /** اعتبارسنجی توکن و برگرداندن payload؛ در صورت نامعتبر بودن null */
  verifyToken(token?: string | null): StudentTokenPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expected = signPayload(encoded);

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StudentTokenPayload;
      if (!payload?.sid || !payload?.nc || !payload?.exp) return null;
      if (payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  },

  /** توکن Bearer را از هدر درخواست می‌خواند و payload برمی‌گرداند */
  readTokenFromContext(ctx: any): StudentTokenPayload | null {
    const header = ctx?.request?.header?.authorization || '';
    if (!header.toLowerCase().startsWith('bearer ')) return null;
    return this.verifyToken(header.slice(7).trim());
  },

  async findByNationalCode(nationalCode: string) {
    return strapi.db.query('api::student.student').findOne({
      where: { nationalCode },
      populate: [],
    });
  },
}));
