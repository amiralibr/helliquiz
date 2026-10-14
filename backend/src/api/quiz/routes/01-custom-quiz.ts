export default {
  routes: [
    {
      method: 'POST',
      path: '/quizzes/submit',
      handler: 'api::quiz.quiz.submit',
      config: {
        auth: false,
      },
    },
  ],
};
