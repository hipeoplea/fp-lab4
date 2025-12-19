import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../state/session';

export default function ProfileMenu() {
  const { clearSession } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-[#282e39] cursor-pointer flex items-center justify-center text-sm font-bold text-white bg-primary"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">person</span>
        <span className="sr-only">Profile</span>
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-40 rounded-xl border border-[#e5e7eb] dark:border-[#282e39] bg-white dark:bg-[#111318] shadow-lg z-50">
          <button
            className="w-full text-left px-4 py-3 text-sm font-medium text-[#111318] dark:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#1c1f27]"
            onClick={logout}
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
