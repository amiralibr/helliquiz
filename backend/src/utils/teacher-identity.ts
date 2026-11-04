/**
 * تشخیص هویت دبیر از توکن users-permissions.
 *
 * مسیرهای مدیریت دانش‌آموز با `auth: false` تعریف شده‌اند تا خروجی خطای
 * کنترل‌شده بدهیم؛ اما فقط کاربری که نقشش `Authenticated` (دبیر) است اجازه دارد.
 */

const USER_UID = 'plugin::users-permissions.user';
const TEACHER_ROLE_TYPE = 'authenticated';

export interface TeacherIdentity {
  id: number;
  username?: string;
  email?: string;
  roleType?: string;
}

export async function resolveTeacherFromContext(
  ctx: any
): Promise<TeacherIdentity | null> {
  const header = ctx.request?.headers?.authorization;

  if (typeof header !== 'string' || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = header.slice(7).trim();
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
    populate: ['role'],
  });

  if (!user || user.blocked) return null;
  if (user.role?.type !== TEACHER_ROLE_TYPE) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roleType: user.role?.type,
  };
}
