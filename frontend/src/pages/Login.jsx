import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({ email, password, name, role: 'CLIENT' });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <UtensilsCrossed className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Catering Service AI</h1>
          <p className="text-gray-500 mt-1">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setEmail('admin@cateringpro.com');
              setPassword('password123');
            }}
            className="w-full mb-4 btn bg-gray-100 text-gray-700 hover:bg-gray-200 py-3"
          >
            Use Demo Login (Admin)
          </button>
          <p className="text-xs text-gray-500 text-center mb-3">Other Demo Accounts (all use password123):</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div
              className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => { setEmail('admin@cateringpro.com'); setPassword('password123'); }}
            >
              <strong>Admin:</strong><br />
              admin@cateringpro.com
            </div>
            <div
              className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => { setEmail('sarah@cateringpro.com'); setPassword('password123'); }}
            >
              <strong>Manager:</strong><br />
              sarah@cateringpro.com
            </div>
            <div
              className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => { setEmail('john@smithwedding.com'); setPassword('password123'); }}
            >
              <strong>Client:</strong><br />
              john@smithwedding.com
            </div>
            <div
              className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => { setEmail('chef.alex@cateringpro.com'); setPassword('password123'); }}
            >
              <strong>Staff:</strong><br />
              chef.alex@cateringpro.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
