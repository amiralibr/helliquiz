import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::submission.submission',
  () => ({
    async find(ctx) {
      const query = (ctx.query || {}) as Record<string, any>;

      const userPagination =
        typeof query.pagination === 'object' && query.pagination !== null
          ? query.pagination
          : {};

      // در استراپی ۵ مقدار 'draft' هم Draft و هم Published را بازمی‌گرداند
      // مگر اینکه فرانت‌اند صراحتاً فقط منتشرشده‌ها را خواسته باشد
      const status = query.status || 'draft';

      ctx.query = {
        ...query,
        status,
        populate: {
          quiz: {
            fields: ['id', 'documentId', 'title', 'durationMinutes'],
          },
        },
        sort: query.sort || ['createdAt:desc'],
        pagination: {
          pageSize: 100,
          ...userPagination,
        },
      };

      return await super.find(ctx);
    },

    async findOne(ctx) {
      const query = (ctx.query || {}) as Record<string, any>;

      const status = query.status || 'draft';

      ctx.query = {
        ...query,
        status,
        populate: {
          quiz: {
            fields: ['id', 'documentId', 'title', 'durationMinutes'],
          },
        },
      };

      return await super.findOne(ctx);
    },
  }),
);
