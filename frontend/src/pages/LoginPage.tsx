import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      const { accessToken, refreshToken, user } = response.data.data;

      setAuth(user, accessToken, refreshToken);
      toast.success('Login successful!');
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.register({ email, password, firstName, lastName });
      toast.success('Registration successful! Please login.');
      setIsLogin(true);
      setPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: 'admin' | 'demo') => {
    if (role === 'admin') {
      setEmail('admin@potrades.com');
      setPassword('admin123');
    } else {
      setEmail('demo@potrades.com');
      setPassword('demo123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-3xl font-bold">P</span>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold">PoTrades</h1>
              <p className="text-sm text-gray-400">Binary Options Trading</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-700">
          {/* Tab Switcher */}
          <div className="flex bg-gray-900 rounded-lg p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                isLogin ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                !isLogin ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : isLogin ? (
                'Login'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Quick Login */}
          {isLogin && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-3">Quick demo login:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => quickLogin('admin')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded-lg transition-colors"
                >
                  Admin
                </button>
                <button
                  onClick={() => quickLogin('demo')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded-lg transition-colors"
                >
                  Demo User
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Production-grade binary options trading platform
        </p>
      </div>
    </div>
  );
}
