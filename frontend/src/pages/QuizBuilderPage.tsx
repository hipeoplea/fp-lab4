import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuiz, getQuiz, updateQuiz } from '../api/client';
import { useSession } from '../state/session';
import type { Quiz, QuizCreateRequest } from '../types';

type Mode = 'create' | 'edit';
type QuestionKind = 'multiple_choice' | 'true_false' | 'ordering' | 'input';

type EditableChoice = { text: string; is_correct?: boolean; position: number };
type EditableQuestion = {
  id?: number;
  prompt: string;
  type: QuestionKind;
  time_limit_ms: number;
  points: number;
  position: number;
  choices: EditableChoice[];
};

const DEFAULT_CHOICES: EditableChoice[] = [
  { text: '', is_correct: true, position: 1 },
  { text: '', is_correct: false, position: 2 },
  { text: '', is_correct: false, position: 3 },
  { text: '', is_correct: false, position: 4 }
];

export default function QuizBuilderPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([createEmptyQuestion(1, 'multiple_choice')]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (mode === 'edit' && id) {
        setLoading(true);
        try {
          const data = await getQuiz(id, session.token, session.apiBase);
          hydrate(data);
        } catch (err) {
          setToast(err instanceof Error ? err.message : 'Failed to load quiz');
        } finally {
          setLoading(false);
        }
      }
    };
    load();
  }, [id, mode, session]);

  const hydrate = (quiz: Quiz) => {
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    const qs: EditableQuestion[] = quiz.questions
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type === 'tf' ? 'true_false' : 'multiple_choice',
        time_limit_ms: q.time_limit_ms,
        points: q.points,
        position: q.position,
        choices: q.choices
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ text: c.text, is_correct: c.is_correct, position: c.position }))
      }));
    setQuestions(qs.length ? qs : [createEmptyQuestion(1, 'multiple_choice')]);
    setActiveIndex(0);
  };

  const activeQuestion = questions[activeIndex];

  const updateQuestion = (idx: number, next: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? {
              ...q,
              ...next,
              choices:
                next.type && next.type !== q.type
                  ? resetChoicesForType(next.type)
                  : next.choices
                  ? next.choices
                  : q.choices
            }
          : q
      )
    );
  };

  const updateChoice = (qIdx: number, cIdx: number, next: Partial<EditableChoice>) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              choices: q.choices.map((c, j) => (j === cIdx ? { ...c, ...next } : c))
            }
          : q
      )
    );
  };

  const setCorrect = (qIdx: number, cIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              choices: q.choices.map((c, j) => ({ ...c, is_correct: j === cIdx }))
            }
          : q
      )
    );
  };

  const mapTypeToApi = (kind: QuestionKind): 'mcq' | 'tf' => {
    if (kind === 'true_false') return 'tf';
    return 'mcq';
  };

  const buildChoicesForPayload = (q: EditableQuestion) => {
    if (q.type === 'input') {
      const answer = q.choices[0]?.text || '';
      return [{ text: answer, is_correct: true, position: 1 }];
    }
    if (q.type === 'ordering') {
      return q.choices.map((c, ci) => ({
        text: c.text,
        is_correct: ci === 0,
        position: ci + 1
      }));
    }
    if (q.type === 'true_false') {
      const base =
        q.choices.length === 2
          ? q.choices
          : [
              { text: 'True', is_correct: true, position: 1 },
              { text: 'False', is_correct: false, position: 2 }
            ];
      return base.map((c, ci) => ({
        text: c.text,
        is_correct: !!c.is_correct && ci === 0 ? true : !!c.is_correct,
        position: ci + 1
      }));
    }
    return q.choices.map((c, ci) => ({
      text: c.text,
      is_correct: !!c.is_correct,
      position: ci + 1
    }));
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError(null);

    const payload: QuizCreateRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      is_public: false,
      questions: questions.map((q, qi) => ({
        type: mapTypeToApi(q.type),
        prompt: q.prompt,
        time_limit_ms: q.time_limit_ms,
        points: q.points,
        position: qi + 1,
        choices: buildChoicesForPayload(q)
      }))
    };

    setLoading(true);
    let saved = false;
    try {
      if (mode === 'create') {
        await createQuiz(payload, session.token, session.apiBase);
        saved = true;
      } else if (mode === 'edit' && id) {
        await updateQuiz(id, payload, session.token, session.apiBase);
        saved = true;
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
      if (saved || !session.apiBase) {
        navigate('/library', { replace: true });
      }
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-[#282e39] bg-white dark:bg-[#111318] px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined">quiz</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              {mode === 'create' ? 'Create New Quiz' : 'Edit Quiz'}
            </h2>
            <p className="text-slate-500 dark:text-[#9da6b9] text-xs font-normal">Saved to Drafts</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-gray-100 dark:bg-[#282e39] hover:bg-gray-200 dark:hover:bg-[#3b4354] text-slate-900 dark:text-white text-sm font-bold leading-normal transition-colors"
            onClick={() => setToast('Preview is not implemented yet')}
          >
            <span className="material-symbols-outlined mr-2 text-[20px]">visibility</span>
            <span className="truncate">Preview</span>
          </button>
          <button
            className="flex items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary hover:bg-blue-600 text-white text-sm font-bold leading-normal transition-colors shadow-lg shadow-blue-900/20"
            onClick={onSubmit}
            disabled={loading}
          >
            <span className="truncate">{loading ? 'Saving...' : 'Done'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white dark:bg-[#111318] border-r border-gray-200 dark:border-[#282e39] flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-gray-200 dark:border-[#282e39] flex justify-between items-center">
            <div>
              <h1 className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Questions</h1>
              <p className="text-slate-500 dark:text-[#9da6b9] text-xs font-normal">{questions.length} slides</p>
            </div>
            <button
              className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#282e39] text-slate-500 dark:text-[#9da6b9]"
              onClick={() => {
                setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1, 'multiple_choice')]);
                setActiveIndex(questions.length);
              }}
              title="Add question"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
            {questions.map((q, idx) => (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`group flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1c1f27] cursor-pointer transition-colors relative ${
                  idx === activeIndex ? 'bg-gray-100 dark:bg-[#1c1f27]' : ''
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-[#282e39] rounded text-[10px] font-bold text-slate-500 dark:text-[#9da6b9]">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-[#9da6b9]">image</span>
                    <span className="text-slate-900 dark:text-white text-xs font-medium truncate">{q.prompt || 'Untitled'}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 dark:bg-[#282e39] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${Math.min((q.time_limit_ms / 60000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <button
                  className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-[#282e39] text-slate-500 dark:text-[#9da6b9]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (questions.length === 1) return;
                    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, position: i + 1 })));
                    setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
                  }}
                  title="Delete question"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Center editor */}
        <main className="flex-1 bg-background-light dark:bg-[#0f1115] overflow-y-auto custom-scrollbar relative">
            <div className="w-full max-w-[1000px] mx-auto p-8 flex flex-col h-full min-h-[800px]">
              {/* Question prompt */}
              <div className="w-full mb-6">
                <div className="relative group">
                  <input
                    className={`w-full bg-white dark:bg-[#1c1f27] text-slate-900 dark:text-white text-center text-2xl font-bold rounded-2xl p-4 border ${
                      titleError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-transparent focus:ring-2 focus:ring-primary'
                    } shadow-sm placeholder:text-slate-300 dark:placeholder:text-[#3b4354] transition-all`}
                    placeholder="Quiz Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {titleError ? (
                    <p className="mt-2 text-sm text-red-500 text-center">{titleError}</p>
                  ) : (
                    <div className="absolute bottom-4 right-4 text-xs text-slate-400 dark:text-[#555e70] font-mono pointer-events-none">
                      {title.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Question prompt */}
              <div className="w-full mb-6">
                <div className="relative group">
                  <textarea
                    className="w-full bg-white dark:bg-[#1c1f27] text-slate-900 dark:text-white text-center text-2xl font-bold rounded-2xl p-6 border-0 focus:ring-2 focus:ring-primary shadow-sm resize-none min-h-[120px] placeholder:text-slate-300 dark:placeholder:text-[#3b4354] transition-all"
                    placeholder="Start typing your question here..."
                    value={activeQuestion?.prompt || ''}
                    onChange={(e) => activeQuestion && updateQuestion(activeIndex, { prompt: e.target.value })}
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-slate-400 dark:text-[#555e70] font-mono pointer-events-none">
                    {activeQuestion?.prompt.length || 0}
                  </div>
                </div>
              </div>

              {/* Answers */}
              <div className="grid grid-cols-2 gap-4 w-full">
              {DEFAULT_CHOICES.map((choice, idx) => {
                const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
                const icons = ['change_history', 'diamond', 'circle', 'square'];
                const current = activeQuestion?.choices[idx] || choice;
                return (
                  <div
                    key={idx}
                    className="group relative flex items-center bg-white dark:bg-[#1c1f27] rounded-xl overflow-hidden border border-transparent focus-within:border-primary shadow-sm transition-all h-20"
                  >
                    <div
                      className="h-full w-14 flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: colors[idx % colors.length] }}
                    >
                      <span className="material-symbols-outlined text-[28px] drop-shadow-md">{icons[idx % icons.length]}</span>
                    </div>
                    <input
                      className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white px-4 text-lg font-medium placeholder:text-slate-300 dark:placeholder:text-[#3b4354]"
                      placeholder={`Add answer ${idx + 1}`}
                      value={current.text}
                      onChange={(e) => activeQuestion && updateChoice(activeIndex, idx, { text: e.target.value })}
                    />
                    <div className="pr-4">
                      <label className="cursor-pointer size-8 rounded-full border-2 border-gray-200 dark:border-[#3b4354] hover:border-primary flex items-center justify-center transition-all">
                        <input
                          className="hidden"
                          type="radio"
                          checked={!!current.is_correct}
                          onChange={() => activeQuestion && setCorrect(activeIndex, idx)}
                        />
                        <span className="material-symbols-outlined text-[20px] text-primary">{current.is_correct ? 'check' : ''}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right sidebar settings */}
        <aside className="w-80 bg-white dark:bg-[#111318] border-l border-gray-200 dark:border-[#282e39] flex flex-col shrink-0 z-10 overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-gray-200 dark:border-[#282e39]">
            <h3 className="text-slate-900 dark:text-white text-base font-bold">Settings</h3>
          </div>
            <div className="p-5 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-slate-500 dark:text-[#9da6b9] text-xs font-bold uppercase tracking-wider">Question Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Multiple Choice', value: 'multiple_choice' as QuestionKind, icon: 'quiz' },
                    { label: 'True / False', value: 'true_false' as QuestionKind, icon: 'task_alt' },
                    { label: 'Ordering', value: 'ordering' as QuestionKind, icon: 'format_list_numbered' },
                    { label: 'Input', value: 'input' as QuestionKind, icon: 'keyboard' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => activeQuestion && updateQuestion(activeIndex, { type: opt.value })}
                      className={`flex items-center justify-between w-full p-3 rounded-xl border ${
                        activeQuestion?.type === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'bg-gray-50 dark:bg-[#1c1f27] border-gray-200 dark:border-[#282e39] text-slate-900 dark:text-white hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </div>
                      {activeQuestion?.type === opt.value ? (
                        <span className="material-symbols-outlined text-primary">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-400">radio_button_unchecked</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-slate-500 dark:text-[#9da6b9] text-xs font-bold uppercase tracking-wider">Time Limit</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    className={`h-10 rounded-lg ${
                      activeQuestion?.time_limit_ms === sec * 1000
                        ? 'bg-primary text-white border border-primary shadow-md shadow-blue-900/20'
                        : 'bg-gray-50 dark:bg-[#1c1f27] border border-gray-200 dark:border-[#282e39] text-slate-500 dark:text-[#9da6b9]'
                    } text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#282e39]`}
                    onClick={() => activeQuestion && updateQuestion(activeIndex, { time_limit_ms: sec * 1000 })}
                    type="button"
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
              <div className="flex flex-col gap-2">
                <label className="text-slate-500 dark:text-[#9da6b9] text-xs font-bold uppercase tracking-wider">Points</label>
                <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-[#1c1f27] rounded-xl border border-gray-200 dark:border-[#282e39]">
                  {[0, 1000, 2000].map((val, idx) => {
                    const labels = ['Zero', 'Standard', 'Double'];
                    return (
                    <button
                      key={val}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                        activeQuestion?.points === val
                          ? 'bg-white dark:bg-[#282e39] text-slate-900 dark:text-white shadow-sm border border-gray-100 dark:border-transparent'
                          : 'text-slate-500 dark:text-[#9da6b9] hover:text-white hover:bg-gray-200 dark:hover:bg-[#282e39]'
                      }`}
                      type="button"
                      onClick={() => activeQuestion && updateQuestion(activeIndex, { points: val })}
                    >
                      {labels[idx]}
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-auto p-4 border-t border-gray-200 dark:border-[#282e39]">
              <button
              className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 py-2 text-sm font-bold"
              type="button"
              onClick={() => {
                setQuestions([createEmptyQuestion(1, 'multiple_choice')]);
                setActiveIndex(0);
              }}
            >
              <span className="material-symbols-outlined">delete</span>
              Delete Question
            </button>
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-sm" role="alert">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function createEmptyQuestion(position: number, type: QuestionKind): EditableQuestion {
  return {
    prompt: '',
    type,
    time_limit_ms: 20000,
    points: 1000,
    position,
    choices: resetChoicesForType(type)
  };
}

function resetChoicesForType(type: QuestionKind): EditableChoice[] {
  if (type === 'true_false') {
    return [
      { text: 'True', is_correct: true, position: 1 },
      { text: 'False', is_correct: false, position: 2 }
    ];
  }
  if (type === 'ordering') {
    return [
      { text: '', is_correct: false, position: 1 },
      { text: '', is_correct: false, position: 2 },
      { text: '', is_correct: false, position: 3 }
    ];
  }
  if (type === 'input') {
    return [{ text: '', is_correct: true, position: 1 }];
  }
  return [...DEFAULT_CHOICES];
}
