import { useEffect, useState } from 'react';
import { api, type AuthResponse } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PricingSection } from './components/PricingSection';
import { LandingPage } from './pages/LandingPage';
import { CollectorPage } from './pages/CollectorPage';
import { PublicWallPage } from './pages/PublicWallPage';
import { StudioPage } from './pages/StudioPage';
import type { PlanTier, SpaceConfig, UserProfile, Workspace } from '../shared/types';

export function App() {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [search, setSearch] = useState<string>(() => window.location.search || '');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [spaces, setSpaces] = useState<SpaceConfig[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const navigate = (nextPath: string) => {
    if (nextPath === path + search) return;
    window.history.pushState({}, '', nextPath);
    const url = new URL(nextPath, window.location.origin);
    setPath(url.pathname);
    setSearch(url.search);
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
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setWorkspace(res.workspace);
        setSpaces(res.spaces);
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  const applyAuth = (res: AuthResponse) => {
    setUser(res.user);
    setWorkspace(res.workspace);
    setSpaces(res.spaces);
  };

  const handleStartDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await api.loginDemo();
      applyAuth(res);
      navigate('/studio');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PlanTier) => {
    if (!user) {
      await handleStartDemo();
      return;
    }
    const res = await api.updateWorkspace({ plan });
    setWorkspace(res.workspace);
    navigate('/studio');
  };

  const handleLogout = async () => {
    await api.logout();
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
    <div className="min-h-screen flex flex-col bg-[#f6f8f9] text-slate-900">
      <Navbar
        currentPath={path}
        user={user}
        onNavigate={navigate}
        onOpenAuth={() => setAuthOpen(true)}
        onStartDemo={handleStartDemo}
        onLogout={handleLogout}
        demoLoading={demoLoading}
      />

      <main className="flex-1">
        {collectMatch ? (
          <CollectorPage slug={collectMatch[1]} onNavigate={navigate} />
        ) : wallMatch ? (
          <PublicWallPage slug={wallMatch[1]} onNavigate={navigate} />
        ) : path === '/pricing' ? (
          <PricingSection activePlan={workspace?.plan} onSelectPlan={handleSelectPlan} />
        ) : path === '/studio' ? (
          !authReady ? (
            <div className="p-16 text-center text-sm text-slate-500">Loading studio…</div>
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
              <h2 className="text-2xl font-extrabold text-slate-900">
                Open your Founder Studio
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Explore the pre-loaded 2-brand demo workspace in one click or create your free studio.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleStartDemo}
                  className="cursor-pointer rounded-2xl bg-teal-700 py-3 text-sm font-bold text-white hover:bg-teal-800"
                >
                  Launch 1-Click Demo Studio
                </button>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  Sign In / Create Account
                </button>
              </div>
            </div>
          )
        ) : (
          <LandingPage
            onNavigate={navigate}
            onStartDemo={handleStartDemo}
            onSelectPlan={handleSelectPlan}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/80 py-6 text-center text-xs text-slate-500">
        VouchVoice — 20-second voice notes, Wall of Love embeds & two-way syndication · $9/mo or $79 Lifetime
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
