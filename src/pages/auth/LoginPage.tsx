import { useState } from 'react';
import { Boxes, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brand-600/5 blur-3xl" />

      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-brand items-center justify-center shadow-lg shadow-brand-900/50 mb-4">
            <Boxes size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NexusOMS</h1>
          <p className="text-sm text-ink-400 mt-1">He thong Quan ly Don hang Enterprise</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <LogIn size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">Dang nhap</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexusoms.vn"
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Mat khau</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? 'Dang dang nhap...' : 'Dang nhap'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-ink-50 border border-ink-200 px-4 py-3">
            <p className="text-xs text-ink-500 font-medium mb-2">Tai khoan demo:</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600">admin@nexusoms.vn</span>
                <span className="text-ink-400">Admin@123</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600">manager@nexusoms.vn</span>
                <span className="text-ink-400">Manager@123</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600">warehouse@nexusoms.vn</span>
                <span className="text-ink-400">Warehouse@123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
