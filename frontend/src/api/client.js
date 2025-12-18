import { useSession } from '../stores/session';

const { session } = useSession();

async function request(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const resp = await fetch(`${session.apiBase}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await resp.text();
  const data = text ? JSON.parse(text) : {};

  if (!resp.ok) {
    const error = data?.error || data?.details || resp.statusText;
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  return data;
}

export function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload });
}

export function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload });
}

export function getQuizzes() {
  return request('/quizzes', { method: 'GET' });
}

export function getQuiz(id) {
  return request(`/quizzes/${id}`, { method: 'GET' });
}

export function createQuiz(payload) {
  return request('/quizzes', { method: 'POST', body: payload });
}

export function updateQuiz(id, payload) {
  return request(`/quizzes/${id}`, { method: 'PUT', body: payload });
}

export function deleteQuiz(id) {
  return request(`/quizzes/${id}`, { method: 'DELETE' });
}
