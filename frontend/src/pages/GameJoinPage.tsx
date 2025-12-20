import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkNickname } from '../api/client';

export default function GameJoinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin || !nickname) return;
    setLoading(true);
    try {
      const res = await checkNickname(pin, nickname);
      if (!res.available) {
        setError('Username is already taken');
        return;
      }
      navigate(`/game/${pin}/play?nickname=${encodeURIComponent(nickname)}`);
    } catch {
      setError('Username is already taken');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white dark:bg-[#1c1f27] rounded-2xl shadow-xl border border-slate-200 dark:border-[#282e39] p-6 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold">Join Game</h1>
        <input
          className="w-full h-12 px-3 rounded-xl bg-[#f9fafb] dark:bg-[#101622] border border-[#e5e7eb] dark:border-[#3b4354]"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <input
          className="w-full h-12 px-3 rounded-xl bg-[#f9fafb] dark:bg-[#101622] border border-[#e5e7eb] dark:border-[#3b4354]"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-primary text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
          disabled={!pin || !nickname || loading}
        >
          {loading ? 'Checking...' : 'Join'}
        </button>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </form>
    </div>
  );
}
