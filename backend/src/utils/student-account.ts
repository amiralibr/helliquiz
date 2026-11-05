/**
 * ساخت و مدیریت حساب دانش‌آموز روی users-permissions.
 *
 * حساب دانش‌آموز **فقط** توسط دبیر (`/api/teacher-students`) ساخته می‌شود و
 * ثبت‌نام عمومی وجود ندارد. همهٔ قواعد ساخت حساب در همین فایل است:
 *   username = کد ملی، email = <کد ملی>@student.helliquiz.local، نقش Student
 */

export const USER_UID = 'plugin::users-permissions.user';
export const STUDENT_ROLE_TYPE = 'student';
export const STUDENT_EMAIL_DOMAIN = 'student.helliquiz.local';
export const NATIONAL_CODE_PATTERN = /^\d{10}$/;
export const MIN_PASSWORD_LENGTH = 8;

export type AppError = Error & { status?: number };

/** خطای HTTP با وضعیت مشخص */
export const httpError = (status: number, message: string): AppError => {
  const error = new Error(message) as AppError;
  error.status = status;
  return error;
};

export const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export const isValidNationalCode = (value: string): boolean =>
  NATIONAL_CODE_PATTERN.test(value) && !/^(\d)\1{9}$/.test(value);

export const studentEmail = (nationalCode: string) =>
  `${nationalCode}@${STUDENT_EMAIL_DOMAIN}`;

/** نقش دانش‌آموز را برمی‌گرداند و در صورت نبودن می‌سازد */
export async function getStudentRole(strapi: any) {
  let role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: STUDENT_ROLE_TYPE } });

  if (!role) {
    role = await strapi
      .plugin('users-permissions')
      .service('role')
      .create({
        name: 'Student',
        description: 'دانش‌آموز — فقط کارنامه‌ی خودش را می‌بیند',
        type: STUDENT_ROLE_TYPE,
      });
  }

  return role;
}

/** کاربری که این کد ملی را اشغاب کرده (با کد ملی، نام کاربری یا ایمیل) */
export async function findUserByNationalCode(strapi: any, nationalCode: string) {
  return strapi.db.query(USER_UID).findOne({
    where: {
      $or: [
        { nationalCode },
        { username: nationalCode },
        { email: studentEmail(nationalCode) },
      ],
    },
    populate: ['role'],
  });
}

export interface NewStudentInput {
  fullName: unknown;
  studentClass: unknown;
  nationalCode: unknown;
  password: unknown;
}

export interface StudentAccount {
  id: number;
  documentId: string;
  fullName: string;
  studentClass: string;
  nationalCode: string;
}

/** اعتبارسنجی ورودی ساخت حساب (خطا با وضعیت ۴۰۰ پرتاب می‌کند) */
export function validateStudentInput(input: NewStudentInput) {
  const fullName = cleanText(input.fullName, 80);
  const studentClass = cleanText(input.studentClass, 40);
  const nationalCode =
    typeof input.nationalCode === 'string' ? input.nationalCode.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (fullName.length < 3) {
    throw httpError(400, 'نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
  }
  if (studentClass.length < 1) {
    throw httpError(400, 'کلاس / پایه را وارد کنید.');
  }
  if (!isValidNationalCode(nationalCode)) {
    throw httpError(400, 'کد ملی باید دقیقاً ۱۰ رقم و معتبر باشد.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw httpError(400, `رمز عبور باید دست‌کم ${MIN_PASSWORD_LENGTH} نویسه باشد.`);
  }

  return { fullName, studentClass, nationalCode, password };
}

/** ساخت حساب دانش‌آموز (نقش Student، ورود فعال) */
export async function createStudentAccount(
  strapi: any,
  input: NewStudentInput
): Promise<StudentAccount> {
  const { fullName, studentClass, nationalCode, password } =
    validateStudentInput(input);

  const existing = await findUserByNationalCode(strapi, nationalCode);
  if (existing) {
    throw httpError(409, 'این کد ملی قبلاً ثبت شده است.');
  }

  const role = await getStudentRole(strapi);

  try {
    const user = await strapi.plugin('users-permissions').service('user').add({
      username: nationalCode,
      email: studentEmail(nationalCode),
      password,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: role.id,
      fullName,
      studentClass,
      nationalCode,
    });

    return {
      id: user.id,
      documentId: user.documentId,
      fullName: user.fullName || fullName,
      studentClass: user.studentClass || studentClass,
      nationalCode: user.nationalCode || nationalCode,
    };
  } catch (error: any) {
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      throw httpError(409, 'این کد ملی قبلاً ثبت شده است.');
    }
    strapi.log.error('خطا در ساخت حساب دانش‌آموز:', error);
    throw httpError(500, 'ساخت حساب دانش‌آموز انجام نشد. دوباره تلاش کنید.');
  }
}
