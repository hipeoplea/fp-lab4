<template>
  <div v-if="isAuthed" class="shell">
    <header>
      <h1>Quiz Auth Console</h1>
      <nav class="tabs">
        <RouterLink class="tab" :class="{ active: route.name === 'dashboard' }" to="/dashboard">Дашборд</RouterLink>
        <RouterLink class="tab" :class="{ active: route.name === 'profile' }" to="/profile">Профиль</RouterLink>
        <RouterLink class="tab" :class="{ active: route.name?.startsWith('quiz') }" to="/quiz/new">Создать квиз</RouterLink>
      </nav>
    </header>

    <main>
      <section style="grid-column: 1 / -1; padding: 0;">
        <RouterView />
      </section>
    </main>
  </div>

  <div v-else class="auth-shell">
    <div class="auth-card">
      <RouterView />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSession } from './stores/session';

const route = useRoute();
const { session } = useSession();
const isAuthed = computed(() => Boolean(session.token));
</script>
