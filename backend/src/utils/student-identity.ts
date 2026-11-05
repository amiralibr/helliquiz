/**
 * تشخیص هویت دانش‌آموز از توکن users-permissions.
 *
 * مسیر ثبت کارنامه عمداً `auth: false` است تا مهمان هم بتواند آزمون بدهد؛
 * اما اگر درخواست توکن معتبر دانش‌آموز داشته باشد، نام/کلاس/کد ملی از
 * حساب او خوانده می‌شود تا کسی نتواند با کد ملی دیگری کارنامه بسازد.
 */

const USER_UID = 'plugin::users-permissions.user';

export interface StudentIdentity {
  id: number;
  documentId?: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
}

/** کاربرِ پشت توکن Bearer را برمی‌گرداند (فقط اگر دانش‌آموزِ فعال باشد) */
export async function resolveStudentFromContext(
  ctx: any
): Promise<StudentIdentity | null> {
  const header = ctx.request?.headers?.authorization;

  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  let payload: any;

  try {
    payload = await strapi.plugin('users-permissions').service('jwt').verify(token);
  } catch {
    return null;
  }

  if (!payload?.id) return null;

  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: payload.id },
  });

  if (!user || user.blocked || !user.nationalCode) {
    return null;
  }

  return {
    id: user.id,
    documentId: user.documentId,
    fullName: user.fullName || user.username || '',
    studentClass: user.studentClass || '',
    nationalCode: user.nationalCode,
  };
}
