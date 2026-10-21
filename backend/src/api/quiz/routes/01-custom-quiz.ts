export default {
  routes: [
    {
      method: 'POST',
      path: '/quizzes/:id/submit',
      handler: 'quiz.submit',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
