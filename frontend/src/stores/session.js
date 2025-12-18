import { reactive, readonly } from 'vue';

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('quiz_auth_session'));
  } catch (_) {
    return null;
  }
})();

const state = reactive({
  token: saved?.token || null,
  user: saved?.user || null,
  apiBase: window.APP_API_BASE || 'http://localhost:4000/api'
});

function setSession(payload) {
  state.token = payload?.token || null;
  state.user = payload?.user || null;
  localStorage.setItem('quiz_auth_session', JSON.stringify({ token: state.token, user: state.user }));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('quiz_auth_session');
}

export function useSession() {
  return {
    session: readonly(state),
    setSession,
    clearSession
  };
}
