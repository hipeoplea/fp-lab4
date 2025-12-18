<template>
  <h2 class="panel-title">Профиль</h2>
  <p class="muted">Вы вошли. Токен сохранён в localStorage.</p>
  <div class="profile-card" v-if="session.token">
    <div class="row">
      <div>
        <div style="font-weight: 700;">{{ session.user?.email }}</div>
        <div class="muted">{{ session.user?.name || 'Без имени' }}</div>
      </div>
      <button @click="logout">Выйти</button>
    </div>
    <p class="muted" style="margin: 12px 0 4px;">JWT</p>
    <div class="token">{{ session.token }}</div>
  </div>
  <div v-else class="alert" style="margin-top: 14px;">Нет активной сессии. Перейдите на страницу входа.</div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';

const router = useRouter();
const { session, clearSession } = useSession();

const logout = () => {
  clearSession();
  router.push('/login');
};
</script>
