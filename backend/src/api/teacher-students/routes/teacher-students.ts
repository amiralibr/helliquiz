export default {
  routes: [
    {
      method: 'GET',
      path: '/teacher-students',
      handler: 'teacher-students.list',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/teacher-students',
      handler: 'teacher-students.create',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'PATCH',
      path: '/teacher-students/:id',
      handler: 'teacher-students.update',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/teacher-students/:id',
      handler: 'teacher-students.remove',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
