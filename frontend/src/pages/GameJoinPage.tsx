import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GameJoinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pin || !nickname) return;
    navigate(`/game/${pin}/play?nickname=${encodeURIComponent(nickname)}`);
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
          className="h-12 rounded-full bg-primary text-white font-bold hover:bg-blue-600 transition-colors"
          disabled={!pin || !nickname}
        >
          Join
        </button>
      </form>
    </div>
  );
}
