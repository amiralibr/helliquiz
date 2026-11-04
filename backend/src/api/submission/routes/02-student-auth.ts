/**
 * مسیرهای اختصاصی حساب دانش‌آموز.
 * کاربران در مدل users-permissions نگه‌داری می‌شوند؛ این مسیرها فقط
 * ثبت‌نام، مهاجرت رمز قدیمی و خواندن کارنامه‌ی خودِ دانش‌آموز را انجام می‌دهند.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/student-auth/register',
      handler: 'student-auth.register',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/student-auth/me',
      handler: 'student-auth.me',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
