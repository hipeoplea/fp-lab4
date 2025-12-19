import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGameChannel } from '../hooks/useGameChannel';
import type { QuestionStartedPayload } from '../types';

export default function GamePlayerPage() {
  const { pin = '' } = useParams();
  const [searchParams] = useSearchParams();
  const nickname = searchParams.get('nickname') || 'Player';
  const { state, error, commands, connecting } = useGameChannel({ pin, role: 'player', nickname });
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [submittedChoiceId, setSubmittedChoiceId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [orderedChoices, setOrderedChoices] = useState<QuestionStartedPayload['choices']>([]);

  const question = useMemo(() => {
    if (state.phase === 'question') return state.data;
    if (state.phase === 'reveal') return state.question;
    return null;
  }, [state]);

  const isFinished = state.phase === 'finished';

  const leaderboard =
    state.phase === 'reveal'
      ? state.reveal.leaderboard
      : state.phase === 'finished'
        ? state.leaderboard
        : state.phase === 'leaderboard'
          ? state.resume.leaderboard || []
          : [];

  const questionIndex =
    state.phase === 'question'
      ? state.data.question_index
      : state.phase === 'reveal'
        ? state.question.question_index
        : state.phase === 'leaderboard'
          ? state.resume.question_index
          : undefined;

  const totalQuestions =
    state.phase === 'question'
      ? state.data.total_questions
      : state.phase === 'reveal'
        ? state.question.total_questions
        : state.phase === 'leaderboard'
          ? state.resume.total_questions
          : undefined;

  useEffect(() => {
    if (state.phase === 'question') {
      setSelectedChoice(null);
      setSubmittedChoiceId(null);
      setInputValue('');
      const sorted = [...state.data.choices].sort((a, b) => a.position - b.position);
      setOrderedChoices(sorted);
      if (state.data.type === 'ordering' && sorted.length) {
        setSelectedChoice(sorted[0].id);
      }
    } else {
      setRemainingMs(0);
    }
  }, [state]);

  useEffect(() => {
    if (state.phase === 'question') {
      const tick = () => {
        setRemainingMs(Math.max(0, state.data.ends_at_ms - Date.now()));
      };
      tick();
      const id = setInterval(tick, 200);
      return () => clearInterval(id);
    }
  }, [state]);

  const onSubmit = async () => {
    if (state.phase !== 'question' || selectedChoice === null) return;
    await commands.submitAnswer(state.data.question_id, selectedChoice);
    setSubmittedChoiceId(selectedChoice);
  };

  const isLobby = state.phase === 'lobby';
  const isLeaderboard = state.phase === 'leaderboard';

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-slate-900 dark:text-white transition-colors">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-[#282e39] px-4 md:px-10 py-3 bg-white dark:bg-[#111318] z-20 relative">
        <div className="flex items-center gap-3">
          <div className="size-10 text-primary flex items-center justify-center bg-primary/10 rounded-full">
            <span className="material-symbols-outlined text-2xl">public</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold leading-tight tracking-[-0.015em]">Game PIN: {pin}</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Playing as {nickname}</span>
          </div>
        </div>
        <button
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-gray-100 dark:bg-[#1c1f27] text-slate-900 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 dark:hover:bg-[#282e39] transition-colors border border-transparent"
          onClick={() => (window.location.href = '/library')}
        >
          <span className="material-symbols-outlined md:mr-2 text-lg">home</span>
          <span className="hidden md:inline truncate">Home</span>
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4 py-6 pb-28 md:px-8 relative z-10">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          {/* Progress & Timer */}
          {state.phase !== 'finished' ? (
            <div className="flex flex-col md:flex-row gap-6 md:gap-4 items-center justify-between w-full">
              <div className="flex flex-col gap-2 w-full md:max-w-xs order-2 md:order-1">
                <div className="flex justify-between items-end px-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">Progress</span>
                  {questionIndex !== undefined && totalQuestions ? (
                    <span className="text-base font-bold text-primary">
                      Question {questionIndex} <span className="text-gray-400 font-normal">/ {totalQuestions}</span>
                    </span>
                  ) : null}
                </div>
                <div className="rounded-full bg-gray-200 dark:bg-[#282e39] h-3 w-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(43,108,238,0.4)]"
                    style={{
                      width: questionIndex && totalQuestions ? `${Math.round((questionIndex / totalQuestions) * 100)}%` : '0%'
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center order-1 md:order-2">
                <div className="relative flex items-center justify-center size-20 md:size-24 bg-white dark:bg-[#111318] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <svg className="size-full -rotate-90 p-1" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100 dark:text-[#282e39]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    ></path>
                    <path
                      className="text-primary drop-shadow-[0_0_8px_rgba(43,108,238,0.6)] transition-all duration-1000"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${Math.max(0, Math.min(100, (remainingMs / ((question?.ends_at_ms || 0) - Date.now() + remainingMs)) * 100))}, 100`}
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    ></path>
                  </svg>
                  <div className="absolute flex flex-col items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="text-2xl md:text-3xl font-extrabold leading-none tracking-tighter">
                      {Math.ceil(remainingMs / 1000)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-[-2px]">Sec</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block w-full md:max-w-xs order-3"></div>
            </div>
          ) : null}

          {/* Question */}
          <div className="flex flex-col items-center gap-6 mt-2 md:mt-4">
            <div className="w-full relative group rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9] max-h-[320px] shadow-2xl shadow-black/20 ring-1 ring-white/10 bg-gradient-to-t from-background-dark/95 via-background-dark/50 to-transparent flex items-center justify-center">
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-col justify-end h-full">
                <div className="inline-flex mb-3">
                  <span className="bg-primary/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    {isLobby ? 'Waiting' : isLeaderboard ? 'Leaderboard' : isFinished ? 'Finished' : 'Question'}
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-lg max-w-3xl">
                  {isLobby
                    ? 'Waiting for host to start...'
                    : isLeaderboard
                      ? 'Waiting for next question...'
                      : isFinished
                        ? 'Game finished'
                        : question?.prompt || 'Waiting for question...'}
                </h1>
              </div>
            </div>
          </div>

          {/* Answers */}
          {!isLobby && !isLeaderboard && !isFinished ? (
            <div className="mt-4 pb-8 w-full">
              {question?.type === 'tf' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {question.choices.slice(0, 2).map((choice, idx) => (
                    <button
                      key={choice.id}
                      className={`flex items-center justify-between px-4 py-4 rounded-2xl border-2 text-left ${
                        selectedChoice === choice.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 dark:border-[#282e39] bg-white dark:bg-[#1e2430] text-gray-900 dark:text-white'
                      } ${submittedChoiceId === choice.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedChoice(choice.id)}
                      disabled={state.phase !== 'question'}
                    >
                      <span className="text-lg font-semibold">{choice.text || (idx === 0 ? 'True' : 'False')}</span>
                      <span className="material-symbols-outlined">{selectedChoice === choice.id ? 'check_circle' : 'radio_button_unchecked'}</span>
                    </button>
                  ))}
                </div>
              ) : question?.type === 'ordering' ? (
                <div className="flex flex-col gap-3">
                  {orderedChoices.map((choice, idx) => (
                    <div
                      key={choice.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                        submittedChoiceId === choice.id ? 'border-primary' : 'border-gray-200 dark:border-[#282e39]'
                      } bg-white dark:bg-[#1e2430]`}
                    >
                      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">{idx + 1}</div>
                      <span className="flex-1 text-base font-semibold">{choice.text}</span>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="size-8 rounded-full bg-gray-100 dark:bg-[#282e39] flex items-center justify-center text-[#6b7280] hover:text-primary disabled:opacity-40"
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...orderedChoices];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setOrderedChoices(next);
                            setSelectedChoice(next[0]?.id ?? null);
                          }}
                        >
                          <span className="material-symbols-outlined text-base">expand_less</span>
                        </button>
                        <button
                          type="button"
                          className="size-8 rounded-full bg-gray-100 dark:bg-[#282e39] flex items-center justify-center text-[#6b7280] hover:text-primary disabled:opacity-40"
                          disabled={idx === orderedChoices.length - 1}
                          onClick={() => {
                            const next = [...orderedChoices];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            setOrderedChoices(next);
                            setSelectedChoice(next[0]?.id ?? null);
                          }}
                        >
                          <span className="material-symbols-outlined text-base">expand_more</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : question?.type === 'input' ? (
                <div className="flex items-center gap-3 bg-white dark:bg-[#1e2430] border border-[#e5e7eb] dark:border-[#282e39] rounded-xl px-4 py-4">
                  <span className="material-symbols-outlined text-primary">keyboard</span>
                  <input
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-300 dark:placeholder:text-[#3b4354]"
                    placeholder="Enter your answer"
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValue(val);
                      setSelectedChoice(val.trim() ? question.choices[0]?.id ?? null : null);
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {question?.choices.map((choice) => (
                    <button
                      key={choice.id}
                      className={`group relative flex items-center gap-4 p-3 md:p-5 rounded-2xl border-2 w-full text-left ${
                        selectedChoice === choice.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-[#1e2430] border-transparent hover:border-primary hover:bg-blue-50 dark:hover:bg-[#252b3b]'
                      } shadow-sm hover:shadow-[0_0_20px_rgba(43,108,238,0.15)] ${
                        submittedChoiceId === choice.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedChoice(choice.id)}
                      disabled={state.phase !== 'question'}
                    >
                      <div className="size-12 md:size-14 rounded-xl bg-[#e5e7eb] dark:bg-[#282e39] flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform shrink-0">
                        <span className="material-symbols-outlined text-[#111318] dark:text-white text-3xl">check_circle</span>
                      </div>
                      <span className={`text-lg md:text-xl font-bold ${selectedChoice === choice.id ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        {choice.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {state.phase === 'reveal' || isLeaderboard || state.phase === 'finished' ? (
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#282e39] bg-white dark:bg-[#1e2430] p-4 shadow-sm">
              <p className="text-sm text-[#637588] dark:text-[#9da6b9] mb-3">
                {state.phase === 'finished'
                  ? 'Game finished.'
                  : isLeaderboard
                    ? 'Waiting for next question...'
                    : 'Question ended. Waiting for next...'}
              </p>
              {leaderboard.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#9da6b9]">
                        <th className="py-2 px-2 text-left">Player</th>
                        <th className="py-2 px-2 text-left">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#282e39]">
                      {leaderboard.map((row, idx) => (
                        <tr key={idx} className="text-[#111318] dark:text-white">
                          <td className="py-2 px-2">{row.nickname}</td>
                          <td className="py-2 px-2">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
      {error ? (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm" role="alert">
          {error}
        </div>
      ) : null}
      {connecting ? (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-sm" role="status">
          Connecting...
        </div>
      ) : null}
      <div className="sticky bottom-0 w-full bg-white dark:bg-[#111318] border-t border-[#e5e7eb] dark:border-[#282e39] px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-[#6b7280] dark:text-[#9da6b9]">Playing as {nickname}</div>
        <button
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/25 transition-all transform active:scale-[0.98]"
          onClick={onSubmit}
          disabled={state.phase !== 'question' || selectedChoice === null}
        >
          <span className="truncate">
            {isFinished
              ? 'Game finished'
              : isLobby
                ? 'Waiting...'
                : state.phase === 'question'
                  ? submittedChoiceId
                    ? 'Answer submitted'
                    : 'Submit Answer'
                  : 'Waiting...'}
          </span>
        </button>
      </div>
    </div>
  );
}
