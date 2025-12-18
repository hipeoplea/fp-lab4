import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getQuizzes } from '../api/client';
import { useSession } from '../state/session';
import type { Quiz } from '../types';

export default function DashboardPage() {
  const { session } = useSession();
  const location = useLocation();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getQuizzes(session.token, session.apiBase);
        setQuizzes(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const metrics = useMemo(() => {
    const totalQuizzes = quizzes.length;
    const totalQuestions = quizzes.reduce((acc, q) => acc + q.questions.length, 0);
    const published = quizzes.filter((q) => q.is_public).length;
    return { totalQuizzes, totalQuestions, published };
  }, [quizzes]);

  const recent = useMemo(() => {
    return [...quizzes]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [quizzes]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <div className="flex w-[280px] flex-col border-r border-[#e5e7eb] dark:border-[#282e39] bg-white dark:bg-[#111318] transition-all duration-300">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-primary" />
              <div className="flex flex-col">
                <h1 className="text-[#111318] dark:text-white text-base font-bold leading-normal">Creator</h1>
                <p className="text-[#637588] dark:text-[#9da6b9] text-xs font-normal leading-normal">Pro Creator</p>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              <SideNavLink to="/dashboard" label="Dashboard" icon="dashboard" activePath={location.pathname} />
              <SideNavLink to="/library" label="My Library" icon="library_books" activePath={location.pathname} />
              <SideNavLink to="/reports" label="Reports" icon="analytics" activePath={location.pathname} />
              <SideNavLink to="/discover" label="Discover" icon="search" activePath={location.pathname} />
            </nav>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
        <div className="flex flex-col gap-6 p-6 lg:p-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Dashboard</h1>
            <p className="text-[#6b7280] dark:text-[#9da6b9] text-base font-normal">Your quizzes at a glance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Quizzes" value={metrics.totalQuizzes} />
            <StatCard label="Questions" value={metrics.totalQuestions} />
            <StatCard label="Published" value={metrics.published} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#111318] dark:text-white text-xl font-bold leading-tight tracking-tight">Recent Activity</h3>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] dark:border-[#282e39] bg-white dark:bg-[#1c2333] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f9fafb] dark:bg-[#232a3b] border-b border-[#e5e7eb] dark:border-[#282e39]">
                      <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9da6b9] uppercase tracking-wider">Quiz Title</th>
                      <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9da6b9] uppercase tracking-wider w-32">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9da6b9] uppercase tracking-wider w-48">Last Edited</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#282e39]">
                    {recent.map((quiz) => (
                      <tr key={quiz.id} className="group hover:bg-[#f9fafb] dark:hover:bg-[#252d40] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-16 rounded bg-cover bg-center shrink-0 border border-[#e5e7eb] dark:border-[#3b4354] bg-[#111827]/40" />
                            <div className="flex flex-col">
                              <span className="text-[#111318] dark:text-white font-medium text-sm">{quiz.title}</span>
                              <span className="text-[#637588] dark:text-[#9da6b9] text-xs">{quiz.questions.length} Questions</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {quiz.is_public ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[#637588] dark:text-[#9da6b9] text-sm">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            {new Date(quiz.updated_at).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {recent.length === 0 ? (
                      <tr>
                        <td className="px-6 py-4 text-sm text-[#637588]" colSpan={3}>
                          {loading ? 'Loading...' : 'No quizzes yet.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1c2333] border border-[#e5e7eb] dark:border-[#282e39] shadow-sm relative overflow-hidden">
      <p className="text-[#637588] dark:text-[#9da6b9] text-sm font-medium uppercase tracking-wider">{label}</p>
      <p className="text-[#111318] dark:text-white text-3xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function SideNavLink({
  to,
  label,
  icon,
  activePath
}: {
  to: string;
  label: string;
  icon: string;
  activePath: string;
}) {
  const isActive = activePath.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg group transition-colors ${
        isActive ? 'bg-primary/10 dark:bg-[#282e39]' : 'hover:bg-[#f3f4f6] dark:hover:bg-[#1c212c]'
      }`}
    >
      <span
        className={`material-symbols-outlined ${
          isActive ? 'text-primary dark:text-white' : 'text-[#637588] dark:text-[#9da6b9] group-hover:text-primary'
        }`}
      >
        {icon}
      </span>
      <p
        className={`text-sm font-medium leading-normal ${
          isActive
            ? 'text-[#111318] dark:text-white'
            : 'text-[#111318] dark:text-[#d0d5dd] group-hover:text-primary dark:group-hover:text-white'
        }`}
      >
        {label}
      </p>
    </Link>
  );
}
