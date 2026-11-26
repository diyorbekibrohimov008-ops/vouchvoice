import { useEffect, useState } from 'react';
import { api, type AuthResponse } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PricingSection } from './components/PricingSection';
import { LandingPage } from './pages/LandingPage';
import { CollectorPage } from './pages/CollectorPage';
import { PublicWallPage } from './pages/PublicWallPage';
import { StudioPage } from './pages/StudioPage';
import type { SpaceConfig, UserProfile, Workspace } from '../shared/types';

export function App() {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [search, setSearch] = useState<string>(() => window.location.search || '');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [spaces, setSpaces] = useState<SpaceConfig[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const navigate = (nextPath: string) => {
    if (nextPath === path + search) return;
    window.history.pushState({}, '', nextPath);
    const url = new URL(nextPath, window.location.origin);
    setPath(url.pathname);
    setSearch(url.search);
    setGlobalError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname || '/');
      setSearch(window.location.search || '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setWorkspace(res.workspace);
        setSpaces(res.spaces);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const applyAuth = (res: AuthResponse) => {
    setUser(res.user);
    setWorkspace(res.workspace);
    setSpaces(res.spaces);
    setGlobalError(null);
  };

  const handleStartDemo = async () => {
    setDemoLoading(true);
    setGlobalError(null);
    try {
      const res = await api.loginDemo();
      applyAuth(res);
      navigate('/studio');
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'Could not open the demo studio right now. Please try again.'
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const handleGetStarted = async () => {
    if (user) {
      navigate('/studio');
      return;
    }
    await handleStartDemo();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear local session even if server cookie already expired
    }
    setUser(null);
    setWorkspace(null);
    setSpaces([]);
    if (path.startsWith('/studio')) navigate('/');
  };

  const params = new URLSearchParams(search);
  const isEmbed = params.get('embed') === '1';

  const collectMatch = path.match(/^\/collect\/([a-z0-9-]+)\/?$/);
  const wallMatch = path.match(/^\/wall\/([a-z0-9-]+)\/?$/);

  if (wallMatch && isEmbed) {
    return <PublicWallPage slug={wallMatch[1]} embedMode onNavigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8] text-[#131722]">
      <Navbar
        currentPath={path}
        user={user}
        onNavigate={navigate}
        onOpenAuth={() => setAuthOpen(true)}
        onStartDemo={handleStartDemo}
        onLogout={handleLogout}
        demoLoading={demoLoading}
      />

      {globalError && (
        <div
          role="alert"
          className="border-b border-[#F5C2BF] bg-[#FEF2F2] px-4 py-2.5 text-center text-xs font-semibold text-[#B91C1C]"
        >
          {globalError}
        </div>
      )}

      <main className="flex-1">
        {collectMatch ? (
          <CollectorPage slug={collectMatch[1]} onNavigate={navigate} />
        ) : wallMatch ? (
          <PublicWallPage slug={wallMatch[1]} onNavigate={navigate} />
        ) : path === '/pricing' ? (
          <PricingSection onGetStarted={handleGetStarted} isSignedIn={Boolean(user)} />
        ) : path === '/studio' ? (
          !authReady ? (
            <div className="p-16 text-center text-sm text-[#576278]">Loading your studio…</div>
          ) : user && workspace ? (
            <StudioPage
              user={user}
              workspace={workspace}
              spaces={spaces}
              onWorkspaceUpdated={setWorkspace}
              onSpacesUpdated={setSpaces}
              onNavigate={navigate}
            />
          ) : (
            <div className="mx-auto max-w-md px-4 py-20 text-center">
              <h1 className="font-display text-3xl font-extrabold text-[#131722]">
                Open your Review Studio
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-[#4B5568]">
                Collect customer reviews by voice in 20 seconds and put them on your website — free.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleStartDemo}
                  className="cursor-pointer rounded-xl bg-[#2142E7] py-3 text-sm font-bold text-white transition hover:bg-[#1935C7]"
                >
                  Open demo studio
                </button>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="cursor-pointer rounded-xl border border-[#CED6E3] bg-white py-3 text-sm font-bold text-[#131722] transition hover:bg-[#EEF1F6]"
                >
                  Sign in or create free account
                </button>
              </div>
            </div>
          )
        ) : (
          <LandingPage
            onNavigate={navigate}
            onStartDemo={handleStartDemo}
            onGetStarted={handleGetStarted}
            isSignedIn={Boolean(user)}
          />
        )}
      </main>

      <footer className="border-t border-[#E5E9F0] bg-[#F4F6F8] py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-[#576278] sm:px-6 lg:px-8">
          <span className="font-semibold text-[#131722]">VouchVoice</span>
          <span>Collect customer reviews by voice in 20 seconds and put them on your website — free.</span>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(res) => {
          applyAuth(res);
          navigate('/studio');
        }}
      />
    </div>
  );
}

export default App;
