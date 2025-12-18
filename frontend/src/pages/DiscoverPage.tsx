import { Link, useLocation } from 'react-router-dom';

export default function DiscoverPage() {
  const location = useLocation();
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-[#111318] dark:text-white min-h-screen flex flex-col overflow-x-hidden">
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
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-[#282e39] cursor-pointer">
            <span className="sr-only">Profile</span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex justify-center py-6 px-4 md:px-8 lg:px-10">
        <div className="flex flex-col max-w-[1200px] w-full flex-1 gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-[#e5e7eb] dark:border-[#282e39]/50">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Discover</h1>
              <p className="text-[#6b7280] dark:text-[#9da6b9] text-base font-normal">Discover section is not implemented</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-[#e5e7eb] dark:border-[#3b4354] p-8 text-center text-[#6b7280] dark:text-[#9da6b9]">
            No content here yet.
          </div>
        </div>
      </main>
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
