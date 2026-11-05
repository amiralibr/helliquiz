/**
 * مسیرهای خواندن حساب دانش‌آموز.
 *
 * ثبت‌نام عمومی وجود ندارد: حساب دانش‌آموز فقط توسط دبیر از پنل ساخته می‌شود
 * (`POST /api/teacher-students`). این مسیر فقط پروفایل و کارنامه‌های
 * خودِ دانش‌آموز را برمی‌گرداند.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/student-auth/me',
      handler: 'student-auth.me',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
