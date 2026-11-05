export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-public',
      handler: 'quiz-public.list',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/quiz-public/:id',
      handler: 'quiz-public.findOne',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
