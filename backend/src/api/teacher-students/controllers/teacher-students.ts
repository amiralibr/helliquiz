/**
 * مدیریت دانش‌آموزان توسط دبیر.
 *
 * دبیر از پنل خودش دانش‌آموز می‌سازد (نام، کلاس، کد ملی، رمز) و دانش‌آموز
 * با همان کد ملی و رمز در `/student` وارد می‌شود. حساب‌ها ردیف واقعی
 * users-permissions با نقش Student هستند، پس در پنل ادمین هم دیده می‌شوند.
 *
 * همه‌ی مسیرها فقط با توکن دبیر (نقش Authenticated) در دسترس‌اند.
 */

import {
  USER_UID,
  cleanText,
  createStudentAccount,
  findUserByNationalCode,
  httpError,
  isValidNationalCode,
  MIN_PASSWORD_LENGTH,
  studentEmail,
  type AppError,
} from '../../../utils/student-account';
import { resolveTeacherFromContext } from '../../../utils/teacher-identity';

const SUBMISSION_UID = 'api::submission.submission';

interface StudentRow {
  id: number;
  documentId: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
  blocked: boolean;
  createdAt?: string;
  attempts: number;
}

/** کنترل خطاها: پیام فارسی + وضعیت درست */
const sendError = (ctx: any, error: unknown, fallback: string) => {
  const status = Number((error as AppError)?.status) || 500;

  if (status >= 500) {
    strapi.log.error(fallback, error);
  }

  ctx.throw(status, status >= 500 ? fallback : (error as Error).message);
};

const toStudentRow = (user: any, attempts = 0): StudentRow => ({
  id: user.id,
  documentId: user.documentId,
  fullName: user.fullName || user.username || 'بدون نام',
  studentClass: user.studentClass || '-',
  nationalCode: user.nationalCode || '',
  blocked: Boolean(user.blocked),
  createdAt: user.createdAt,
  attempts,
});


/** کارنامه‌های دانش‌آموز را با کد ملی جدیدش هم‌خوان می‌کند */
async function moveSubmissionsToNewCode(oldCode: string, newCode: string) {
  try {
    const submissions = await strapi.documents(SUBMISSION_UID).findMany({
      filters: { nationalCode: { $eq: oldCode } },
      fields: ['documentId', 'submissionKey'],
      limit: -1,
    });

    for (const submission of submissions as any[]) {
      const key = String(submission.submissionKey || '');
      const separator = key.lastIndexOf(':');
      const newKey = separator > 0 ? `${key.slice(0, separator)}:${newCode}` : key;

      await strapi.documents(SUBMISSION_UID).update({
        documentId: submission.documentId,
        data: { nationalCode: newCode, submissionKey: newKey },
      });
    }
  } catch (error) {
    strapi.log.warn('[teacher-students] انتقال کارنامه‌های دانش‌آموز ناموفق بود:', error);
  }
}

/** فقط ردیف‌هایی که کد ملی دارند = دانش‌آموز */
const isStudent = (user: any) => Boolean(user?.nationalCode);

export default {
  /** GET /api/teacher-students — فهرست دانش‌آموزان + تعداد کارنامه‌ها */
  async list(ctx: any) {
    const teacher = await resolveTeacherFromContext(ctx);
    if (!teacher) {
      return ctx.throw(401, 'برای مدیریت دانش‌آموزان باید با حساب دبیر وارد شوید.');
    }

    try {
      const users = await strapi.db.query(USER_UID).findMany({
        where: { nationalCode: { $notNull: true } },
        orderBy: { createdAt: 'desc' },
        limit: 2000,
      });

      const codes = users.map((user: any) => user.nationalCode).filter(Boolean);

      let attemptsByCode: Record<string, number> = {};

      if (codes.length > 0) {
        const submissions = await strapi.documents(SUBMISSION_UID).findMany({
          filters: { nationalCode: { $in: codes } },
          fields: ['nationalCode'],
          limit: -1,
        });

        attemptsByCode = submissions.reduce((acc: Record<string, number>, item: any) => {
          const code = item.nationalCode;
          if (code) acc[code] = (acc[code] || 0) + 1;
          return acc;
        }, {});
      }

      return ctx.send({
        data: users.map((user: any) => toStudentRow(user, attemptsByCode[user.nationalCode] || 0)),
        meta: { total: users.length },
      });
    } catch (error) {
      return sendError(ctx, error, 'دریافت فهرست دانش‌آموزان ناموفق بود.');
    }
  },

  /** POST /api/teacher-students — ساخت حساب دانش‌آموز توسط دبیر */
  async create(ctx: any) {
    const teacher = await resolveTeacherFromContext(ctx);
    if (!teacher) {
      return ctx.throw(401, 'برای ساخت دانش‌آموز باید با حساب دبیر وارد شوید.');
    }

    const body = (ctx.request.body || {}) as Record<string, unknown>;

    try {
      const student = await createStudentAccount(strapi, {
        fullName: body.fullName,
        studentClass: body.studentClass,
        nationalCode: body.nationalCode,
        password: body.password,
      });

      strapi.log.info(
        `[teacher-students] ${teacher.username || teacher.email} دانش‌آموز ${student.nationalCode} را ساخت.`
      );

      return ctx.send({ data: toStudentRow(student) });
    } catch (error) {
      return sendError(ctx, error, 'ساخت حساب دانش‌آموز ناموفق بود.');
    }
  },

  /** PATCH /api/teacher-students/:id — ویرایش مشخصات، تغییر رمز یا مسدودسازی */
  async update(ctx: any) {
    const teacher = await resolveTeacherFromContext(ctx);
    if (!teacher) {
      return ctx.throw(401, 'برای ویرایش دانش‌آموز باید با حساب دبیر وارد شوید.');
    }

    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ctx.throw(400, 'شناسه‌ی دانش‌آموز نامعتبر است.');
    }

    const body = (ctx.request.body || {}) as Record<string, unknown>;

    try {
      const user: any = await strapi.db.query(USER_UID).findOne({ where: { id } });

      if (!user || !isStudent(user)) {
        throw httpError(404, 'دانش‌آموزی با این شناسه پیدا نشد.');
      }

      const patch: Record<string, unknown> = {};

      if (body.fullName !== undefined) {
        const fullName = cleanText(body.fullName, 80);
        if (fullName.length < 3) {
          throw httpError(400, 'نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
        }
        patch.fullName = fullName;
      }

      if (body.studentClass !== undefined) {
        const studentClass = cleanText(body.studentClass, 40);
        if (studentClass.length < 1) {
          throw httpError(400, 'کلاس / پایه را وارد کنید.');
        }
        patch.studentClass = studentClass;
      }

      if (body.nationalCode !== undefined) {
        const nationalCode =
          typeof body.nationalCode === 'string' ? body.nationalCode.trim() : '';

        if (!isValidNationalCode(nationalCode)) {
          throw httpError(400, 'کد ملی باید دقیقاً ۱۰ رقم و معتبر باشد.');
        }

        if (nationalCode !== user.nationalCode) {
          const clash = await findUserByNationalCode(strapi, nationalCode);
          if (clash) {
            throw httpError(409, 'این کد ملی برای دانش‌آموز دیگری ثبت شده است.');
          }

          // نام کاربری و ایمیل مصنوعی هم باید با کد ملی جدید هم‌خوان شوند
          patch.nationalCode = nationalCode;
          patch.username = nationalCode;
          patch.email = studentEmail(nationalCode);
        }
      }

      if (body.blocked !== undefined) {
        patch.blocked = Boolean(body.blocked);
      }

      if (body.password !== undefined && body.password !== '') {
        const password = typeof body.password === 'string' ? body.password : '';
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw httpError(400, `رمز عبور باید دست‌کم ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
        }
        patch.password = password;
      }

      if (Object.keys(patch).length === 0) {
        throw httpError(400, 'چیزی برای تغییر ارسال نشده است.');
      }

      const updated: any = await strapi
        .plugin('users-permissions')
        .service('user')
        .edit(id, patch);

      // اگر کد ملی عوض شده، کارنامه‌های قبلی هم به کد جدید منتقل شوند
      if (patch.nationalCode && user.nationalCode) {
        await moveSubmissionsToNewCode(user.nationalCode, String(patch.nationalCode));
      }

      return ctx.send({ data: toStudentRow(updated) });
    } catch (error) {
      return sendError(ctx, error, 'ویرایش دانش‌آموز ناموفق بود.');
    }
  },

  /** DELETE /api/teacher-students/:id — حذف حساب و کارنامه‌های همان دانش‌آموز */
  async remove(ctx: any) {
    const teacher = await resolveTeacherFromContext(ctx);
    if (!teacher) {
      return ctx.throw(401, 'برای حذف دانش‌آموز باید با حساب دبیر وارد شوید.');
    }

    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ctx.throw(400, 'شناسه‌ی دانش‌آموز نامعتبر است.');
    }

    try {
      const user: any = await strapi.db.query(USER_UID).findOne({ where: { id } });

      if (!user || !isStudent(user)) {
        throw httpError(404, 'دانش‌آموزی با این شناسه پیدا نشد.');
      }

      if (user.nationalCode) {
        const submissions = await strapi.documents(SUBMISSION_UID).findMany({
          filters: { nationalCode: { $eq: user.nationalCode } },
          fields: ['documentId'],
          limit: -1,
        });

        for (const submission of submissions as any[]) {
          await strapi
            .documents(SUBMISSION_UID)
            .delete({ documentId: submission.documentId });
        }
      }

      await strapi.plugin('users-permissions').service('user').remove({ id });

      return ctx.send({ data: { id, nationalCode: user.nationalCode } });
    } catch (error) {
      return sendError(ctx, error, 'حذف دانش‌آموز ناموفق بود.');
    }
  },
};
