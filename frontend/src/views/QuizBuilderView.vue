<template>
  <div v-if="!loading" class="builder">
    <div class="top-bar">
      <div>
        <div class="muted">{{ isNew ? 'Создание квиза' : 'Редактирование квиза' }}</div>
        <h2 class="panel-title" style="margin: 4px 0 0;">{{ quiz.title }}</h2>
      </div>
      <div class="actions">
        <span class="badge green">{{ dirty ? 'Не сохранено' : 'Сохранено' }}</span>
        <button class="ghost" @click="openPreview">Предпросмотр</button>
        <button class="ghost" @click="exportJson">Экспорт JSON</button>
        <button @click="save">Сохранить</button>
        <button class="ghost" @click="goBack">Назад</button>
      </div>
    </div>

    <div class="grid">
      <section class="meta">
        <h3 class="panel-title">Настройки квиза</h3>
        <label>Название *</label>
        <input v-model="quiz.title" />
        <label>Описание</label>
        <textarea v-model="quiz.description" rows="3"></textarea>
        <label>Публичность</label>
        <select v-model="quiz.public">
          <option :value="true">Публичный</option>
          <option :value="false">Приватный</option>
        </select>
        <label>Теги (через запятую)</label>
        <input v-model="tags" placeholder="elixir, otp" />
      </section>

      <section class="questions">
        <div class="q-head">
          <h3 class="panel-title">Вопросы</h3>
          <button @click="addQuestion">Добавить вопрос</button>
        </div>
        <div class="q-layout">
          <div class="q-list">
            <div
              v-for="(q, idx) in questions"
              :key="q.id"
              class="q-item"
              :class="{ active: q.id === activeId, invalid: !isValid(q) }"
              @click="selectQuestion(q.id)"
            >
              <div class="muted">#{{ idx + 1 }}</div>
              <div class="ellipsis">{{ q.text || 'Без текста' }}</div>
              <span class="badge" v-if="!isValid(q)">!</span>
              <button class="ghost small" @click.stop="duplicateQuestion(q)">Дублировать</button>
              <button class="danger small" @click.stop="removeQuestion(q.id)">Удалить</button>
            </div>
          </div>

          <div class="q-editor" v-if="current">
            <label>Текст вопроса *</label>
            <textarea v-model="current.text" rows="3"></textarea>

            <div class="row">
              <div class="col">
                <label>Тип</label>
                <select v-model="current.type">
                  <option value="mcq">MCQ (4 варианта)</option>
                  <option value="tf">True/False</option>
                </select>
              </div>
              <div class="col">
                <label>Таймер (сек)</label>
                <select v-model.number="current.timer">
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="30">30</option>
                  <option :value="60">60</option>
                </select>
              </div>
              <div class="col">
                <label>Баллы</label>
                <select v-model.number="current.points">
                  <option :value="0">0</option>
                  <option :value="500">500</option>
                  <option :value="1000">1000</option>
                  <option :value="2000">2000</option>
                </select>
              </div>
            </div>

            <label class="row" style="gap: 8px; align-items: center;">
              <input type="checkbox" v-model="current.speed" />
              Учитывать скорость ответа
            </label>

            <div class="answers">
              <div class="answers-head">
                <h4 style="margin: 0;">Варианты</h4>
                <button v-if="current.type === 'mcq'" class="ghost small" @click="addAnswer">Добавить</button>
              </div>
              <div v-for="(ans, idx) in current.answers" :key="ans.id" class="answer-row">
                <input
                  v-if="current.type === 'mcq'"
                  type="radio"
                  name="correct"
                  :checked="ans.correct"
                  @change="setCorrect(ans.id)"
                />
                <select v-else v-model="ans.correct">
                  <option :value="true">Правильный</option>
                  <option :value="false">Неправильный</option>
                </select>
                <input v-model="ans.text" :placeholder="`Вариант ${idx + 1}`" />
                <button class="danger small" v-if="current.type === 'mcq' && current.answers.length > 2" @click="removeAnswer(ans.id)">Удалить</button>
              </div>
              <p class="muted" style="margin: 6px 0 0;">Минимум 2 варианта и ровно один правильный.</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="preview" class="preview">
      <div class="preview-content">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <div class="muted">Предпросмотр</div>
            <div class="panel-title">{{ quiz.title }}</div>
          </div>
          <button class="ghost" @click="preview = false">Закрыть</button>
        </div>
        <div v-for="(q, idx) in questions" :key="q.id" class="preview-question">
          <div class="muted">Вопрос {{ idx + 1 }} • {{ q.points }} pts • {{ q.timer }}s</div>
          <div class="question-text">{{ q.text }}</div>
          <ul class="answers-list">
            <li v-for="ans in q.answers" :key="ans.id" :class="{ correct: ans.correct }">{{ ans.text }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="muted">Загрузка квиза...</div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useQuizzes } from '../stores/quizzes';

const router = useRouter();
const route = useRoute();
const quizStore = useQuizzes();

const quiz = reactive({ id: null, title: 'Новый квиз', description: '', public: false, tags: [] });
const questions = reactive([]);
const activeId = ref(null);
const preview = ref(false);
const dirty = ref(false);
const tags = ref('');
const loading = ref(true);

const current = computed(() => questions.find((q) => q.id === activeId.value));

function addQuestion() {
  const q = {
    id: uuidv4(),
    text: '',
    type: 'mcq',
    timer: 20,
    points: 1000,
    speed: true,
    answers: [
      { id: uuidv4(), text: 'Вариант 1', correct: true },
      { id: uuidv4(), text: 'Вариант 2', correct: false },
      { id: uuidv4(), text: 'Вариант 3', correct: false },
      { id: uuidv4(), text: 'Вариант 4', correct: false }
    ]
  };
  questions.push(q);
  activeId.value = q.id;
  dirty.value = true;
}

function selectQuestion(id) {
  activeId.value = id;
}

function removeQuestion(id) {
  if (questions.length <= 1) return;
  const idx = questions.findIndex((q) => q.id === id);
  if (idx !== -1) {
    questions.splice(idx, 1);
    activeId.value = questions[0]?.id || null;
    dirty.value = true;
  }
}

function duplicateQuestion(q) {
  const clone = JSON.parse(JSON.stringify(q));
  clone.id = uuidv4();
  clone.answers = clone.answers.map((a) => ({ ...a, id: uuidv4() }));
  questions.splice(questions.findIndex((x) => x.id === q.id) + 1, 0, clone);
  activeId.value = clone.id;
  dirty.value = true;
}

function addAnswer() {
  if (current.value.type !== 'mcq') return;
  current.value.answers.push({ id: uuidv4(), text: 'Новый вариант', correct: false });
  dirty.value = true;
}

function removeAnswer(id) {
  current.value.answers = current.value.answers.filter((a) => a.id !== id);
  dirty.value = true;
}

function setCorrect(id) {
  current.value.answers = current.value.answers.map((a) => ({ ...a, correct: a.id === id }));
  dirty.value = true;
}

function isValid(q) {
  if (!q.text || q.text.trim().length === 0) return false;
  if (!q.answers || q.answers.length < 2) return false;
  const correct = q.answers.filter((a) => a.correct);
  if (correct.length !== 1) return false;
  if (![5, 10, 20, 30, 60].includes(Number(q.timer))) return false;
  if (![0, 500, 1000, 2000].includes(Number(q.points))) return false;
  return true;
}

async function save() {
  quiz.tags = tags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const payload = {
    ...quiz,
    questions
  };
  await quizStore.updateQuiz(quiz.id, payload);
  dirty.value = false;
}

function goBack() {
  router.push('/dashboard');
}

function openPreview() {
  preview.value = true;
}

function exportJson() {
  const data = JSON.stringify({ ...quiz, questions }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quiz.title || 'quiz'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// mark dirty on change
watch(
  () => [quiz.title, quiz.description, quiz.public, tags.value, JSON.stringify(questions)],
  () => {
    dirty.value = true;
  },
  { deep: true }
);

onMounted(async () => {
  const paramId = route.params.id;
  if (!paramId || route.name === 'quiz-new') {
    const created = await quizStore.createQuiz();
    Object.assign(quiz, created);
    questions.splice(0, questions.length, ...(created.questions || []));
    activeId.value = questions[0]?.id || null;
    tags.value = quiz.tags?.join(', ') || '';
    await router.replace(`/quiz/${quiz.id}`);
  } else {
    const fetched = await quizStore.fetchQuiz(paramId);
    Object.assign(quiz, fetched);
    questions.splice(0, questions.length, ...(fetched.questions || []));
    activeId.value = questions[0]?.id || null;
    tags.value = quiz.tags?.join(', ') || '';
  }

  if (questions.length === 0) addQuestion();
  loading.value = false;
});
</script>

<style scoped>
.builder { display: flex; flex-direction: column; gap: 14px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px; background: #0b1220; border: 1px solid var(--border); border-radius: 12px; }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.badge { padding: 6px 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); color: var(--muted); }
.badge.green { border-color: rgba(34,211,238,0.4); color: var(--text); }
.ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
.grid { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
.meta, .questions { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #0b1220; }
.meta textarea { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: #0f172a; color: var(--text); }
.q-head { display: flex; justify-content: space-between; align-items: center; }
.q-layout { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
.q-list { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.q-item { padding: 10px; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; cursor: pointer; }
.q-item:last-child { border-bottom: none; }
.q-item.active { background: rgba(34,211,238,0.08); }
.q-item.invalid { border-left: 3px solid #f87171; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.small { padding: 6px 8px; font-size: 12px; }
.danger { background: rgba(248,113,113,0.15); color: #fecdd3; border: 1px solid rgba(248,113,113,0.3); }
.q-editor textarea { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: #0f172a; color: var(--text); }
.row { display: flex; gap: 10px; }
.col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.answers { margin-top: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: #0f172a; }
.answers-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.answer-row { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 6px 0; }
.preview { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; }
.preview-content { background: #0b1220; border: 1px solid var(--border); border-radius: 12px; padding: 16px; width: min(960px, 100%); max-height: 90vh; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
.preview-question { border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
.question-text { font-weight: 700; margin: 6px 0; }
.answers-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.answers-list li { padding: 8px; border-radius: 8px; border: 1px solid var(--border); }
.answers-list li.correct { border-color: rgba(34,211,238,0.5); background: rgba(34,211,238,0.08); }
@media (max-width: 1024px) { .grid { grid-template-columns: 1fr; } .q-layout { grid-template-columns: 1fr; } }
</style>
