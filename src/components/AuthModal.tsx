import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, type AuthResponse } from '../lib/api';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (data: AuthResponse) => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstBrandName, setFirstBrandName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({ name, email, password, firstBrandName })
          : await api.login({ email, password });
      onAuthenticated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.loginDemo();
      onAuthenticated(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#131722]/55 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-[#DCE2EC] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#576278] hover:bg-[#EEF1F6] hover:text-[#131722]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-2xl font-extrabold text-[#131722]">
          {mode === 'register' ? 'Create your free studio' : 'Welcome back'}
        </h2>
        <p className="mt-1 text-sm text-[#4B5568]">
          Collect customer reviews by voice in 20 seconds and put them on your website — free.
        </p>

        <button
          type="button"
          onClick={handleDemo}
          disabled={loading}
          className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#2142E7] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1935C7] disabled:opacity-60"
        >
          Open instant demo studio
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-[#6B768C]">
          <div className="h-px flex-1 bg-[#E5E9F0]" />
          <span>or continue with email</span>
          <div className="h-px flex-1 bg-[#E5E9F0]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#131722]">Your name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#131722]">
                  First brand or product name
                </label>
                <input
                  type="text"
                  value={firstBrandName}
                  onChange={(e) => setFirstBrandName(e.target.value)}
                  placeholder="SignalBoard"
                  className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#131722]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@signalboard.io"
              className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#131722]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-[#CED6E3] px-3.5 py-2.5 text-sm focus:border-[#2142E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2142E7]/30"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-[#131722] py-2.5 text-sm font-bold text-white transition hover:bg-[#232A3B] disabled:opacity-60"
          >
            {loading ? 'Working…' : mode === 'register' ? 'Create free studio' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-[#576278]">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="cursor-pointer font-bold text-[#2142E7] hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New to VouchVoice?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="cursor-pointer font-bold text-[#2142E7] hover:underline"
              >
                Create free studio
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
