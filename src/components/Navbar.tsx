import { Mic, Sparkles, LayoutDashboard, LogOut } from 'lucide-react';
import type { UserProfile } from '../../shared/types';

interface NavbarProps {
  currentPath: string;
  user: UserProfile | null;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onStartDemo: () => void;
  onLogout: () => void;
  demoLoading?: boolean;
}

export function Navbar({
  currentPath,
  user,
  onNavigate,
  onOpenAuth,
  onStartDemo,
  onLogout,
  demoLoading,
}: NavbarProps) {
  const navLink = (path: string, label: string) => {
    const active = currentPath === path;
    return (
      <button
        type="button"
        onClick={() => onNavigate(path)}
        className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
          active
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f8f9]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="flex cursor-pointer items-center gap-2.5 text-left"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-white shadow-sm shadow-teal-700/20">
            <Mic className="h-4.5 w-4.5" />
          </span>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              VouchVoice
            </span>
            <span className="ml-2 hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 sm:inline-block">
              $79 Lifetime
            </span>
          </div>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {navLink('/', 'Product')}
          {navLink('/collect/acme-ai', '20s Voice Collector')}
          {navLink('/wall/acme-ai', 'Wall of Love')}
          {navLink('/pricing', 'Pricing')}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/studio')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Studio</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenAuth}
                className="cursor-pointer rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={demoLoading}
                onClick={onStartDemo}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{demoLoading ? 'Opening…' : 'Launch Demo Studio'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
