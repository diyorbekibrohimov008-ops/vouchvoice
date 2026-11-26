import { LayoutDashboard, LogOut } from 'lucide-react';
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
        className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          active
            ? 'bg-[#131722] text-white'
            : 'text-[#475166] hover:bg-[#E5E9F0]/70 hover:text-[#131722]'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E9F0] bg-[#F4F6F8]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="flex shrink-0 cursor-pointer items-center gap-2 text-left sm:gap-2.5"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-end justify-center gap-[3px] rounded-lg bg-[#131722] px-1.5 pb-1.5"
          >
            <span className="h-2.5 w-[3px] rounded-full bg-white" />
            <span className="h-4.5 w-[3px] rounded-full bg-[#E63B2E]" />
            <span className="h-3.5 w-[3px] rounded-full bg-white" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-[#131722] sm:text-lg">
            VouchVoice
          </span>
        </button>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navLink('/', 'Overview')}
          {navLink('/collect/acme-ai', 'Voice recorder')}
          {navLink('/wall/acme-ai', 'Sample wall')}
          {navLink('/pricing', 'Free forever')}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/studio')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2142E7] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#1935C7] sm:px-4 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Studio</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="inline-flex cursor-pointer items-center rounded-lg border border-[#D4DBE6] bg-white p-2 text-[#475166] transition hover:bg-[#E5E9F0] hover:text-[#131722]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenAuth}
                className="cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold text-[#364055] transition hover:bg-[#E5E9F0]/80 hover:text-[#131722] sm:px-3 sm:text-sm"
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={demoLoading}
                onClick={onStartDemo}
                className="inline-flex cursor-pointer items-center rounded-lg bg-[#2142E7] px-3 py-2 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-[#1935C7] disabled:opacity-60 sm:px-4 sm:text-sm"
              >
                {demoLoading ? 'Opening…' : 'Open free studio'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
