import { Link } from 'react-router-dom';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  actionText: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
  footerNote?: string;
};

export default function AuthLayout({
  title,
  subtitle,
  actionText,
  actionHref,
  actionLabel,
  footerNote,
  children
}: AuthLayoutProps) {
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center opacity-5 dark:opacity-10"
          aria-hidden
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10" />
      </div>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#282e39] bg-white dark:bg-[#111318] px-6 sm:px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <div className="size-8 text-primary">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6H42L36 24L42 42H6L12 24L6 6Z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-black leading-tight tracking-[-0.015em]">QuizMaster</h2>
        </div>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => (window.location.href = '/game/join')}
            className="hidden sm:flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full px-4 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-sm font-bold leading-normal transition-colors"
          >
            <span className="material-symbols-outlined text-base mr-1">smart_display</span>
            Подключиться к игре
          </button>
          <div className="flex gap-4 items-center">
            <span className="hidden md:block text-sm font-medium text-slate-600 dark:text-[#9da6b9]">{actionText}</span>
            <Link
              to={actionHref}
              className="header-cta flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-slate-100 dark:bg-[#1c1f27] hover:bg-slate-200 dark:hover:bg-[#282e39] text-slate-900 dark:text-white text-sm font-bold leading-normal transition-colors"
            >
              <span className="truncate">{actionLabel}</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="layout-content-container flex flex-col max-w-[520px] w-full flex-1">
          <div className="bg-white dark:bg-[#1c1f27] rounded-xl border border-slate-200 dark:border-[#282e39] shadow-2xl p-6 sm:p-10">
            <div className="flex flex-col gap-2 mb-8 text-center sm:text-left">
              <h1 className="text-slate-900 dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">
                {title}
              </h1>
              <p className="text-slate-500 dark:text-[#9da6b9] text-base font-normal leading-normal">{subtitle}</p>
            </div>
            {children}
          </div>
          {footerNote ? <p className="text-center text-slate-500 dark:text-[#9da6b9] text-sm mt-8 pb-4">{footerNote}</p> : null}
        </div>
      </main>
    </div>
  );
}
