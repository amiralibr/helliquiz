/**
 * مسیرهای اختصاصی حساب دانش‌آموز.
 * این مسیرها از هسته‌ی Strapi استفاده نمی‌کنند تا هش رمز عبور هرگز از API بیرون نرود.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/student-auth/register',
      handler: 'student.register',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/student-auth/login',
      handler: 'student.login',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/student-auth/me',
      handler: 'student.me',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
