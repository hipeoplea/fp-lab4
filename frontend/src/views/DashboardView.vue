<template>
  <div class="dashboard">
    <div class="header-card">
      <div class="avatar">{{ initials }}</div>
      <div class="info">
        <div class="name">{{ displayName }}</div>
        <div class="muted">Host account</div>
      </div>
      <div class="actions">
        <button class="ghost" @click="createQuiz">Создать квиз</button>
        <button class="ghost" @click="logout">Выйти</button>
      </div>
    </div>

    <div class="layout">
      <section class="wide">
        <div class="section-head">
          <div>
            <h2 class="panel-title">Мои квизы</h2>
            <p class="muted">Быстрый доступ к черновикам и публичным квизам</p>
          </div>
          <div class="filters">
            <input type="search" placeholder="Поиск по названию" v-model="search" />
            <select v-model="visibility">
              <option value="all">Все</option>
              <option value="public">Публичные</option>
              <option value="private">Приватные</option>
            </select>
            <select v-model="sort">
              <option value="new">Новые</option>
              <option value="old">Старые</option>
              <option value="title">По названию</option>
            </select>
            <button @click="createQuiz">Создать квиз</button>
          </div>
        </div>

        <div v-if="filtered.length === 0" class="empty">
          <p>У вас пока нет квизов</p>
          <button @click="createQuiz">Создать первый квиз</button>
        </div>

        <div class="quiz-grid" v-else>
          <article v-for="quiz in filtered" :key="quiz.id" class="quiz-card">
            <div class="row">
              <div>
                <div class="quiz-title">{{ quiz.title }}</div>
                <div class="muted">Вопросов: {{ quiz.questions }} • {{ formattedDate(quiz.updatedAt) }}</div>
              </div>
              <span class="badge" :class="quiz.public ? 'green' : 'gray'">{{ quiz.public ? 'Публичный' : 'Приватный' }}</span>
            </div>
            <p class="muted" style="margin: 10px 0;">{{ quiz.description || 'Нет описания' }}</p>
            <div class="card-actions">
              <button class="ghost" @click="openQuiz(quiz.id)">Открыть</button>
              <button class="ghost" @click="startQuick(quiz)">Запустить</button>
              <button class="ghost" @click="duplicate(quiz.id)">Дублировать</button>
              <button class="danger" @click="remove(quiz.id)">Удалить</button>
            </div>
          </article>
        </div>
      </section>

      <section class="side">
        <div class="widget">
          <div class="row" style="margin-bottom: 10px;">
            <h3 class="panel-title" style="margin: 0;">Быстрый запуск</h3>
            <span class="muted">опция</span>
          </div>
          <select v-model="selectedQuick">
            <option disabled value="">Выберите квиз</option>
            <option v-for="q in filtered" :value="q.id" :key="q.id">{{ q.title }}</option>
          </select>
          <button :disabled="!selectedQuick" @click="startSession">Старт</button>
          <div v-if="pin" class="pin-box">
            <div class="muted">PIN</div>
            <div class="pin">{{ pin }}</div>
            <div class="card-actions">
              <button class="ghost" @click="copyPin">Скопировать</button>
              <button class="ghost">Открыть экран ведущего</button>
            </div>
          </div>
        </div>

        <div class="widget">
          <h3 class="panel-title" style="margin: 0 0 6px;">История игр</h3>
          <p class="muted">В разработке — здесь появятся завершённые сессии</p>
          <ul class="history">
            <li v-for="item in history" :key="item.id" class="history-item">
              <div>
                <div>{{ item.title }}</div>
                <div class="muted">{{ item.date }} • {{ item.status }}</div>
              </div>
              <span class="badge">{{ item.players }} игроков</span>
            </li>
          </ul>
        </div>

        <div class="widget">
          <h3 class="panel-title" style="margin: 0 0 6px;">Настройки</h3>
          <label class="muted">Имя для отображения</label>
          <input v-model="displayName" />
          <button class="ghost" @click="saveName">Сохранить</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useQuizzes } from '../stores/quizzes';

const router = useRouter();
const { session, setSession, clearSession } = useSession();
const { list, fetchList, createQuiz: createQuizStore, duplicateQuiz, removeQuiz } = useQuizzes();

const search = ref('');
const visibility = ref('all');
const sort = ref('new');
const selectedQuick = ref('');
const pin = ref('');
const loading = ref(false);
const history = ref([
  { id: 'h1', title: 'Основы Elixir', date: '12 дек, 19:30', status: 'Завершена', players: 18 },
  { id: 'h2', title: 'Frontend Mix', date: '10 дек, 15:10', status: 'Завершена', players: 12 }
]);

const displayName = ref(session.user?.name || session.user?.email || 'Без имени');

const initials = computed(() => {
  const base = displayName.value || 'U';
  return base.slice(0, 2).toUpperCase();
});

const filtered = computed(() => {
  let quizzes = [...list.quizzes];
  if (search.value) {
    const q = search.value.toLowerCase();
    quizzes = quizzes.filter((item) => item.title.toLowerCase().includes(q));
  }
  if (visibility.value !== 'all') {
    const pub = visibility.value === 'public';
    quizzes = quizzes.filter((item) => item.public === pub);
  }
  if (sort.value === 'new') {
    quizzes.sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
  } else if (sort.value === 'old') {
    quizzes.sort((a, b) => new Date(a.updatedAt || a.updated_at) - new Date(b.updatedAt || b.updated_at));
  } else {
    quizzes.sort((a, b) => a.title.localeCompare(b.title));
  }
  return quizzes;
});

onMounted(async () => {
  loading.value = true;
  try {
    await fetchList();
  } finally {
    loading.value = false;
  }
});

function formattedDate(date) {
  return date ? new Date(date).toLocaleDateString('ru-RU') : '';
}

function openQuiz(id) {
  router.push(`/quiz/${id}`);
}

async function startQuick(quiz) {
  selectedQuick.value = quiz.id;
  await startSession();
}

async function duplicate(id) {
  const q = await duplicateQuiz(id);
  if (q?.id) router.push(`/quiz/${q.id}`);
}

async function remove(id) {
  if (confirm('Удалить квиз?')) {
    await removeQuiz(id);
  }
}

async function startSession() {
  pin.value = Math.random().toString().slice(2, 8);
}

function copyPin() {
  navigator.clipboard?.writeText(pin.value);
}

async function createQuizAndOpen() {
  const quiz = await createQuizStore();
  if (quiz?.id) router.push(`/quiz/${quiz.id}`);
}

function logout() {
  clearSession();
  router.push('/login');
}

function saveName() {
  setSession({ token: session.token, user: { ...(session.user || {}), name: displayName.value } });
}

// alias createQuiz used in template
const createQuiz = createQuizAndOpen;
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 16px; }
.header-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #0b1220; border: 1px solid var(--border); border-radius: 12px; }
.avatar { width: 48px; height: 48px; border-radius: 12px; background: rgba(34,211,238,0.1); display: grid; place-items: center; color: var(--accent); font-weight: 700; letter-spacing: 0.04em; }
.actions { margin-left: auto; display: flex; gap: 8px; }
.ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
.layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.filters { display: flex; gap: 8px; align-items: center; }
.filters input, .filters select { height: 38px; }
.quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.quiz-card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #0b1220; display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.quiz-title { font-weight: 700; }
.badge { padding: 6px 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); color: var(--muted); }
.badge.green { border-color: rgba(34,211,238,0.4); color: var(--text); }
.badge.gray { border-color: var(--border); color: var(--muted); }
.card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.danger { background: rgba(248,113,113,0.15); color: #fecdd3; border: 1px solid rgba(248,113,113,0.3); }
.empty { border: 1px dashed var(--border); padding: 20px; text-align: center; border-radius: 12px; }
.side { display: flex; flex-direction: column; gap: 12px; }
.widget { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #0b1220; display: flex; flex-direction: column; gap: 10px; }
.pin-box { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: rgba(34,211,238,0.05); }
.pin { font-size: 22px; font-weight: 700; letter-spacing: 0.08em; }
.history { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.history-item { display: flex; justify-content: space-between; align-items: center; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .section-head { flex-direction: column; align-items: flex-start; } .filters { width: 100%; flex-wrap: wrap; } }
</style>
