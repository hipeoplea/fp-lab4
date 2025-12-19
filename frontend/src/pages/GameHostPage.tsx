import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameChannel } from '../hooks/useGameChannel';
import type { QuestionStartedPayload } from '../types';

export default function GameHostPage() {
  const { pin = '' } = useParams();
  const { state, error, commands, connecting, players } = useGameChannel({ pin, role: 'host' });
  const [toast, setToast] = useState<string | null>(null);

  const currentQuestion = useMemo(() => {
    if (state.phase === 'question') return state.data;
    if (state.phase === 'reveal') return state.question;
    return null;
  }, [state]);

  const leaderboard =
    state.phase === 'reveal'
      ? state.reveal.leaderboard
      : state.phase === 'finished'
        ? state.leaderboard
        : state.phase === 'leaderboard'
          ? state.resume.leaderboard || []
          : [];

  const isResumeWaiting = state.phase === 'leaderboard';

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col">
      <header className="h-16 border-b border-[#282e39] bg-[#1c1f27] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-blue-900/20">Q</div>
          <div>
            <p className="text-sm font-semibold">Host Panel</p>
            <button
              type="button"
              className="flex items-center gap-2 text-xl font-extrabold tracking-[0.08em] text-white hover:text-primary transition-colors"
              onClick={() => {
                navigator.clipboard?.writeText(pin).catch(() => {});
                setToast('PIN copied');
              }}
            >
              PIN: {pin}
              <span className="material-symbols-outlined text-base">content_copy</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-bold"
            onClick={() => (window.location.href = '/library')}
          >
            Home
          </button>
          <button
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={connecting || state.phase === 'finished'}
            onClick={async () => {
              if (state.phase === 'leaderboard') {
                await commands.nextQuestion();
                setToast('Continue sent');
              } else {
                await commands.hostStart();
                setToast('Start sent');
              }
            }}
          >
            {state.phase === 'leaderboard' ? 'Continue' : 'Start'}
          </button>
          <button
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={connecting || state.phase === 'finished' || (state.phase !== 'question' && state.phase !== 'reveal' && state.phase !== 'leaderboard')}
            onClick={async () => {
              await commands.nextQuestion();
              setToast('Next sent');
            }}
          >
            Next
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col gap-4">
        {connecting && <p className="text-sm text-[#9da6b9]">Connecting...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {state.phase === 'lobby' ? (
          <div className="rounded-xl border border-[#282e39] p-4 bg-[#111318]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Waiting Room</h2>
              <span className="text-sm text-[#9da6b9]">{players.length} players</span>
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-auto custom-scrollbar">
              {players.length === 0 ? (
                <p className="text-sm text-[#9da6b9]">No players connected yet.</p>
              ) : (
                players.map((p, idx) => (
                  <div key={`${p.player_id || p.nickname}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-[#1c1f27] border border-[#282e39]">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {p.nickname ? p.nickname.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-sm font-medium">{p.nickname || 'Unknown'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
        {state.phase === 'finished' ? (
          <div className="rounded-xl border border-[#282e39] p-4 bg-[#111318]">
            <h2 className="text-xl font-bold mb-3">Game Finished</h2>
            <LeaderboardTable entries={leaderboard} />
          </div>
        ) : null}
        {state.phase === 'question' || state.phase === 'reveal' ? (
          <QuestionCard question={currentQuestion} />
        ) : (
          <div className="rounded-xl border border-[#282e39] p-4 bg-[#111318]">
            <p className="text-sm text-[#9da6b9]">
              {state.phase === 'leaderboard' ? 'Game resumed. Click Next to continue.' : 'Waiting for question...'}
            </p>
          </div>
        )}

        {state.phase === 'reveal' || state.phase === 'leaderboard' ? (
          <div className="rounded-xl border border-[#282e39] p-4 bg-[#111318]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Leaderboard</h3>
              {state.phase === 'leaderboard' ? (
                <span className="text-xs text-[#9da6b9]">Resume point: question {state.resume.question_index}</span>
              ) : null}
            </div>
            <LeaderboardTable entries={leaderboard} />
          </div>
        ) : null}
      </main>
      {toast ? (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-sm" role="alert">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionStartedPayload | null }) {
  if (!question) return null;
  return (
    <div className="rounded-2xl border border-[#282e39] bg-[#0f1115] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-[#9da6b9]">
          Question {question.question_index} / {question.total_questions}
        </span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{question.prompt}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.choices.map((choice) => (
          <div
            key={choice.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1f27] border border-[#282e39] text-left text-lg font-semibold"
          >
            <div className="size-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">{choice.position}</div>
            <span>{choice.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardTable({ entries }: { entries: { nickname: string; score: number }[] }) {
  if (!entries?.length) return <p className="text-sm text-[#9da6b9]">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[#9da6b9]">
            <th className="py-2 px-2">Player</th>
            <th className="py-2 px-2">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#282e39]">
          {entries.map((row, idx) => (
            <tr key={idx} className="text-white">
              <td className="py-2 px-2">{row.nickname}</td>
              <td className="py-2 px-2">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
