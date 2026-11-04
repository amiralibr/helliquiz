import { factories } from '@strapi/strapi';

/**
 * فقط دبیران احراز هویت‌شده به کارنامه‌ها دسترسی دارند.
 * دانش‌آموزان کارنامه‌ی خودشان را از مسیر /api/student-auth/me می‌گیرند.
 */
const requireStaff = (ctx: any) => {
  if (!ctx.state?.user) {
    ctx.unauthorized('برای دسترسی به کارنامه‌ها باید با حساب دبیر وارد شوید.');
    return false;
  }
  return true;
};

export default factories.createCoreController(
  'api::submission.submission',
  () => ({
    async find(ctx) {
      if (!requireStaff(ctx)) return;

      const query = (ctx.query || {}) as Record<string, any>;

      const userPagination =
        typeof query.pagination === 'object' && query.pagination !== null
          ? query.pagination
          : {};

      // در استراپی ۵ مقدار 'draft' هم Draft و هم Published را بازمی‌گرداند
      const status = query.status || 'draft';

      ctx.query = {
        ...query,
        status,
        populate: {
          quiz: {
            fields: ['title', 'durationMinutes'],
          },
        },
        sort: query.sort || ['createdAt:desc'],
        pagination: {
          pageSize: 100,
          ...userPagination,
        },
      };

      const response = await super.find(ctx);

      // کلید داخلی ضدتکرار نباید به کلاینت برود
      if (Array.isArray(response?.data)) {
        response.data = response.data.map(({ submissionKey, ...rest }: any) => rest);
      }

      return response;
    },

    async findOne(ctx) {
      if (!requireStaff(ctx)) return;

      const query = (ctx.query || {}) as Record<string, any>;
      const status = query.status || 'draft';

      ctx.query = {
        ...query,
        status,
        populate: {
          quiz: {
            fields: ['title', 'durationMinutes'],
          },
        },
      };

      const response = await super.findOne(ctx);

      if (response?.data) {
        const { submissionKey, ...rest } = response.data as any;
        return { ...response, data: rest };
      }

      return response;
    },

    async delete(ctx) {
      if (!requireStaff(ctx)) return;
      return super.delete(ctx);
    },

    async update(ctx) {
      if (!requireStaff(ctx)) return;
      return super.update(ctx);
    },

    async create(ctx) {
      if (!requireStaff(ctx)) return;
      return super.create(ctx);
    },
  })
);
