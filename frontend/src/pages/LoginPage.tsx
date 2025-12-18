import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { login } from '../api/client';
import { useSession } from '../state/session';

type Feedback = { type: 'success' | 'error'; text: string };

export default function LoginPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Feedback | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await login({ email: form.email.trim(), password: form.password }, session.apiBase);
      setSession(res);
      navigate('/library', { replace: true });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Login error';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your account."
      actionText="Don't have an account?"
      actionHref="/register"
      actionLabel="Sign Up"
    >
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <label className="flex flex-col gap-2">
          <span className="text-slate-900 dark:text-white text-base font-medium leading-normal">Email</span>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9da6b9] material-symbols-outlined">
              mail
            </span>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#3b4354] bg-slate-50 dark:bg-[#111318] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] pl-12 pr-4 text-base font-normal leading-normal transition-all"
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-900 dark:text-white text-base font-medium leading-normal">Password</span>
            <a className="text-sm font-medium text-primary hover:text-blue-600 hover:underline transition-colors" href="#">
              Forgot password?
            </a>
          </div>
          <div className="relative group flex items-center">
            <span className="absolute left-4 z-10 text-slate-400 dark:text-[#9da6b9] material-symbols-outlined">lock</span>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-[#3b4354] bg-slate-50 dark:bg-[#111318] focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b9] pl-12 pr-12 text-base font-normal leading-normal transition-all"
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-4 z-10 text-slate-400 dark:text-[#9da6b9] hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </label>
        <button
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-4 bg-primary hover:bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/25 transition-all transform active:scale-[0.98] mt-2"
          type="submit"
          disabled={loading}
        >
          <span className="truncate">{loading ? 'Sending...' : 'Log In'}</span>
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = '/game/join')}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-white dark:bg-[#111318] border border-primary text-primary text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/10 transition-all"
        >
          Подключиться к игре
        </button>
        {message ? (
          <div
            className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
              message.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-100'
                : 'border-green-400/40 bg-green-400/10 text-green-100'
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}
