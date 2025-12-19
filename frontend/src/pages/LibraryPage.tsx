import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createGameSession, deleteQuiz, getQuizzes } from '../api/client';
import { useSession } from '../state/session';
import type { Quiz } from '../types';
import ProfileMenu from '../components/ProfileMenu';

export default function LibraryPage() {
  const { session } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getQuizzes(session.token, session.apiBase);
        setQuizzes(data);
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return quizzes.filter((q) => q.title.toLowerCase().includes(term) || (q.description || '').toLowerCase().includes(term));
  }, [quizzes, search]);

  const onDelete = async (id: number) => {
    if (!confirm('Delete this quiz?')) return;
    try {
      await deleteQuiz(String(id), session.token, session.apiBase);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const onHost = async (quizId: number) => {
    try {
      const res = await createGameSession(quizId, session.token, session.apiBase);
      setToast(`Session PIN: ${res.pin}`);
      navigate(`/game/${res.pin}/host`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-[#111318] dark:text-white transition-colors duration-200">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-[#282e39] bg-surface-light dark:bg-background-dark px-6 py-3 lg:px-10 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="size-8 text-primary">
              <svg className="w-full h-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z" fill="currentColor" />
              </svg>
            </div>
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">QuizMaster</h2>
          </div>
          <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
            <nav className="hidden md:flex items-center gap-6 lg:gap-9">
              <NavItem to="/library" activePath={location.pathname} label="My Library" />
              <NavItem to="/reports" activePath={location.pathname} label="Reports" />
            </nav>
            <Link
              to="/quizzes/new"
              className="hidden sm:flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary px-6 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
            >
              <span className="truncate">Create Quiz</span>
            </Link>
            <ProfileMenu />
          </div>
        </header>

        <main className="flex-1 flex justify-center py-6 px-4 md:px-8 lg:px-10">
          <div className="flex flex-col max-w-[1200px] w-full flex-1 gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-[#e5e7eb] dark:border-[#282e39]/50">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">My Library</h1>
                <p className="text-[#6b7280] dark:text-[#9da6b9] text-base font-normal">Manage, edit, and host your quiz collection</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              <div className="flex-1 flex items-center gap-3 rounded-full bg-[#f9fafb] dark:bg-[#101622] px-3 h-12 border border-[#e5e7eb] dark:border-[#3b4354] shadow-sm">
                <span className="material-symbols-outlined text-[#9da6b9]">search</span>
                <input
                  className="flex w-full min-w-0 flex-1 bg-transparent border-none text-base font-normal leading-normal px-1 placeholder:text-[#9da6b9] focus:outline-none focus:ring-0 text-[#111318] dark:text-white"
                  placeholder="Search quizzes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {loading ? <p className="text-sm text-[#6b7280]">Loading...</p> : null}
              {!loading && filtered.length === 0 ? <p className="text-sm text-[#6b7280]">No quizzes yet.</p> : null}
              {filtered.map((quiz) => (
                <div
                  key={quiz.id}
                  className="group flex flex-col sm:flex-row gap-5 p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-[#e5e7eb] dark:border-[#282e39] hover:border-primary/50 hover:shadow-lg dark:hover:shadow-blue-900/10 transition-all duration-300"
                >
                  <div className="relative w-full sm:w-48 aspect-video sm:aspect-[4/3] md:aspect-video rounded-xl overflow-hidden shrink-0 bg-[#0f172a] flex items-center justify-center text-[#6b7280] text-xs font-semibold">
                    {quiz.questions.length} Qs
                  </div>
                  <div className="flex flex-col flex-1 justify-between gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-500/20">
                            <span className="size-1.5 rounded-full bg-gray-500" />
                            {quiz.is_public ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-[#111318] dark:text-white group-hover:text-primary transition-colors cursor-pointer">
                          {quiz.title}
                        </h3>
                        <p className="text-sm text-[#6b7280] dark:text-[#9da6b9] mt-1 line-clamp-2">{quiz.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="size-8 flex items-center justify-center rounded-full hover:bg-red-500/10 hover:text-red-500 text-[#6b7280] dark:text-[#9da6b9] transition-colors"
                          title="Delete"
                          onClick={() => onDelete(quiz.id)}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                      <div className="flex items-center gap-4 text-xs text-[#6b7280] dark:text-[#9da6b9] font-medium">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          Updated {new Date(quiz.updated_at).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">quiz</span>
                          {quiz.questions.length} questions
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <button
                          className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-2 px-4 rounded-full border border-[#e5e7eb] dark:border-[#3b4354] hover:bg-[#f3f4f6] dark:hover:bg-[#282e39] text-sm font-bold text-[#111318] dark:text-white transition-colors"
                          onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          Edit
                        </button>
                        <button
                          className="flex-1 sm:flex-none h-9 flex items-center justify-center gap-2 px-5 rounded-full bg-primary hover:bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
                          onClick={() => onHost(quiz.id)}
                        >
                          <span className="material-symbols-outlined text-[20px]">smart_display</span>
                          Host
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {toast ? (
              <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-sm" role="alert">
                {toast}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, activePath }: { to: string; label: string; activePath: string }) {
  const isActive = activePath.startsWith(to);
  return (
    <Link
      to={to}
      className={`text-sm font-medium leading-normal transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}
    >
      {label}
    </Link>
  );
}
