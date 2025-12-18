import type { AuthResponse, LoginPayload, RegisterPayload } from '../types';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  apiBase?: string;
};

const defaultApiBase = (typeof window !== 'undefined' && window.APP_API_BASE) || 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${options.apiBase ?? defaultApiBase}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = (data as Record<string, unknown>)?.error || (data as Record<string, unknown>)?.details || response.statusText;
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  return data as T;
}

export function register(payload: RegisterPayload, apiBase?: string) {
  return request<AuthResponse>('/auth/register', { method: 'POST', body: payload, apiBase });
}

export function login(payload: LoginPayload, apiBase?: string) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: payload, apiBase });
}

export function getQuizzes(token: string | null, apiBase?: string) {
  return request('/quizzes', { method: 'GET', token, apiBase });
}

export function getQuiz(id: string, token: string | null, apiBase?: string) {
  return request(`/quizzes/${id}`, { method: 'GET', token, apiBase });
}

export function createQuiz(payload: unknown, token: string | null, apiBase?: string) {
  return request('/quizzes', { method: 'POST', body: payload, token, apiBase });
}

export function updateQuiz(id: string, payload: unknown, token: string | null, apiBase?: string) {
  return request(`/quizzes/${id}`, { method: 'PUT', body: payload, token, apiBase });
}

export function deleteQuiz(id: string, token: string | null, apiBase?: string) {
  return request(`/quizzes/${id}`, { method: 'DELETE', token, apiBase });
}
