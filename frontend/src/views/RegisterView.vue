<template>
  <h2 class="panel-title">Регистрация</h2>
  <p class="muted">Создайте аккаунт. После успешной регистрации вы попадёте в профиль.</p>
  <form @submit.prevent="onSubmit">
    <div>
      <label>Имя (опционально)</label>
      <input type="text" v-model="form.name" autocomplete="name" />
    </div>
    <div>
      <label>Email</label>
      <input type="email" v-model="form.email" required autocomplete="email" />
    </div>
    <div>
      <label>Пароль</label>
      <input type="password" v-model="form.password" required minlength="8" autocomplete="new-password" />
    </div>
    <button type="submit" :disabled="loading">{{ loading ? 'Загрузка...' : 'Зарегистрироваться' }}</button>
  </form>
  <p class="muted" style="margin-top: 10px;">Уже есть аккаунт? <RouterLink to="/login">Войти</RouterLink></p>
  <div v-if="message" :class="['alert', message.type === 'error' ? '' : 'success']" style="margin-top: 14px;">{{ message.text }}</div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../api/client';
import { useSession } from '../stores/session';

const router = useRouter();
const { setSession } = useSession();

const form = reactive({ name: '', email: '', password: '' });
const loading = ref(false);
const message = ref(null);

const onSubmit = async () => {
  message.value = null;
  loading.value = true;
  try {
    const res = await register(form);
    setSession(res);
    message.value = { type: 'success', text: 'Регистрация успешна' };
    router.push('/dashboard');
  } catch (err) {
    message.value = { type: 'error', text: err.message || 'Ошибка регистрации' };
  } finally {
    loading.value = false;
  }
};
</script>
