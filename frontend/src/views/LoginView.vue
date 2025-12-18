<template>
  <h2 class="panel-title">Вход</h2>
  <p class="muted">Введите email и пароль, чтобы получить токен и перейти в профиль.</p>
  <form @submit.prevent="onSubmit">
    <div>
      <label>Email</label>
      <input type="email" v-model="form.email" required autocomplete="email" />
    </div>
    <div>
      <label>Пароль</label>
      <input type="password" v-model="form.password" required autocomplete="current-password" />
    </div>
    <button type="submit" :disabled="loading">{{ loading ? 'Загрузка...' : 'Войти' }}</button>
  </form>
  <p class="muted" style="margin-top: 10px;">Нет аккаунта? <RouterLink to="/register">Зарегистрироваться</RouterLink></p>
  <div v-if="message" :class="['alert', message.type === 'error' ? '' : 'success']" style="margin-top: 14px;">{{ message.text }}</div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../api/client';
import { useSession } from '../stores/session';

const router = useRouter();
const { setSession } = useSession();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const message = ref(null);

const onSubmit = async () => {
  message.value = null;
  loading.value = true;
  try {
    const res = await login(form);
    setSession(res);
    message.value = { type: 'success', text: 'Вход выполнен' };
    router.push('/dashboard');
  } catch (err) {
    message.value = { type: 'error', text: err.message || 'Ошибка входа' };
  } finally {
    loading.value = false;
  }
};
</script>
