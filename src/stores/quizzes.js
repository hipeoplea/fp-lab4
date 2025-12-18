import { reactive, readonly } from 'vue';
import {
  getQuizzes as apiList,
  getQuiz as apiGet,
  createQuiz as apiCreate,
  updateQuiz as apiUpdate,
  deleteQuiz as apiDelete
} from '../api/client';

const state = reactive({ quizzes: [], loaded: false });

const toFront = (quiz) => ({
  id: quiz.id,
  title: quiz.title,
  description: quiz.description,
  public: quiz.is_public || quiz.public || false,
  updatedAt: quiz.updated_at || quiz.updatedAt,
  questions:
    quiz.questions?.map((q) => ({
      id: q.id,
      text: q.prompt || q.text,
      type: q.type,
      timer: Math.round((q.time_limit_ms || q.timer || 20000) / 1000),
      points: q.points,
      speed: q.speed || true,
      position: q.position,
      answers:
        q.choices?.map((c) => ({
          id: c.id,
          text: c.text,
          correct: c.is_correct || c.correct,
          position: c.position
        })) || q.answers || []
    })) || []
});

const toApi = (quiz) => ({
  title: quiz.title,
  description: quiz.description,
  is_public: quiz.public,
  questions: (quiz.questions || []).map((q, idx) => ({
    type: q.type,
    prompt: q.text,
    time_limit_ms: (q.timer || 20) * 1000,
    points: q.points,
    position: q.position || idx + 1,
    choices: (q.answers || []).map((a, i) => ({
      text: a.text,
      is_correct: !!a.correct,
      position: a.position || i + 1
    }))
  }))
});

async function fetchList() {
  const res = await apiList();
  state.quizzes = res.map(toFront);
  state.loaded = true;
  return state.quizzes;
}

async function fetchQuiz(id) {
  const res = await apiGet(id);
  return toFront(res);
}

async function createQuiz(payload = {}) {
  const defaults = {
    title: 'Новый квиз',
    description: '',
    public: false,
    questions: [
      {
        text: 'Новый вопрос',
        type: 'mcq',
        timer: 20,
        points: 1000,
        answers: [
          { text: 'Вариант 1', correct: true },
          { text: 'Вариант 2', correct: false }
        ]
      }
    ]
  };
  const res = await apiCreate(toApi({ ...defaults, ...payload }));
  const quiz = toFront(res);
  state.quizzes.unshift(quiz);
  return quiz;
}

async function updateQuiz(id, payload) {
  const res = await apiUpdate(id, toApi(payload));
  const quiz = toFront(res);
  const idx = state.quizzes.findIndex((q) => q.id === id);
  if (idx >= 0) state.quizzes[idx] = quiz;
  return quiz;
}

async function duplicateQuiz(id) {
  const original = await fetchQuiz(id);
  const clone = JSON.parse(JSON.stringify(original));
  clone.title = `${clone.title} (копия)`;
  clone.questions = clone.questions.map((q, idx) => ({
    ...q,
    position: idx + 1,
    answers: q.answers.map((a, i) => ({ ...a, position: i + 1 }))
  }));
  const res = await apiCreate(toApi(clone));
  const quiz = toFront(res);
  state.quizzes.unshift(quiz);
  return quiz;
}

async function removeQuiz(id) {
  await apiDelete(id);
  state.quizzes = state.quizzes.filter((q) => q.id !== id);
}

export function useQuizzes() {
  return {
    list: readonly(state),
    fetchList,
    fetchQuiz,
    createQuiz,
    updateQuiz,
    duplicateQuiz,
    removeQuiz
  };
}
