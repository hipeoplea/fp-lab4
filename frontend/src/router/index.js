import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import DashboardView from '../views/DashboardView.vue';
import QuizBuilderView from '../views/QuizBuilderView.vue';
import { useSession } from '../stores/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/quiz/new',
      name: 'quiz-new',
      component: QuizBuilderView,
      meta: { requiresAuth: true }
    },
    {
      path: '/quiz/:id',
      name: 'quiz-edit',
      component: QuizBuilderView,
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to) => {
  const { session } = useSession();
  if (to.meta.requiresAuth && !session.token) {
    return '/login';
  }
  if (!to.meta.requiresAuth && session.token && (to.name === 'login' || to.name === 'register')) {
    return '/dashboard';
  }
  return true;
});

export default router;
