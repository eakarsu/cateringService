import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { UtensilsCrossed, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // login, register, reset, resetConfirm
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePasswordStrength = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    return errors;
  };

  const validateForm = () => {
    const errs = {};
    if (!validateEmail(email)) errs.email = 'Please enter a valid email';
    if (mode === 'register' || mode === 'resetConfirm') {
      const pwdToCheck = mode === 'register' ? password : newPassword;
      const pwdErrors = validatePasswordStrength(pwdToCheck);
      if (pwdErrors.length > 0) errs.password = pwdErrors;
    }
    if (mode === 'register' && !name.trim()) errs.name = 'Name is required';
    if (mode === 'resetConfirm' && newPassword !== confirmPassword) errs.confirm = 'Passwords do not match';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const checkStrength = async (pwd) => {
    if (!pwd) { setPasswordStrength(null); return; }
    try {
      const res = await api.post('/auth/check-password-strength', { password: pwd });
      setPasswordStrength(res.data);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'register') {
        await register({ email, password, name, role: 'CLIENT' });
        navigate('/');
      } else if (mode === 'reset') {
        const res = await api.post('/auth/reset-password', { email });
        setSuccess(res.data.message);
        if (res.data.resetToken) {
          setResetToken(res.data.resetToken);
          setMode('resetConfirm');
        }
      } else if (mode === 'resetConfirm') {
        await api.post('/auth/reset-password/confirm', { token: resetToken, newPassword });
        setSuccess('Password reset successful! You can now log in.');
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.msg || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = {
    0: 'bg-gray-200', 1: 'bg-red-500', 2: 'bg-orange-500',
    3: 'bg-yellow-500', 4: 'bg-lime-500', 5: 'bg-green-500', 6: 'bg-green-600'
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
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your account'}
            {mode === 'reset' && 'Reset your password'}
            {mode === 'resetConfirm' && 'Enter new password'}
          </p>
        </div>

        {(mode === 'reset' || mode === 'resetConfirm') && (
          <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-4">
            <ArrowLeft size={16} /> Back to login
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="label">Full Name</label>
              <input type="text" className={`input ${validationErrors.name ? 'border-red-500' : ''}`} value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
              {validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
            </div>
          )}

          {mode !== 'resetConfirm' && (
            <div>
              <label className="label">Email</label>
              <input type="email" className={`input ${validationErrors.email ? 'border-red-500' : ''}`} value={email} onChange={(e) => { setEmail(e.target.value); setValidationErrors(prev => ({ ...prev, email: undefined })); }} required placeholder="you@example.com" />
              {validationErrors.email && <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>}
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className={`input pr-10 ${validationErrors.password ? 'border-red-500' : ''}`} value={password} onChange={(e) => { setPassword(e.target.value); if (mode === 'register') checkStrength(e.target.value); }} required placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'register' && passwordStrength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {Array(6).fill(0).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < passwordStrength.strength ? strengthColors[passwordStrength.strength] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{passwordStrength.label}</p>
                </div>
              )}
              {validationErrors.password && (
                <ul className="text-xs text-red-600 mt-1">
                  {validationErrors.password.map((e, i) => <li key={i}>- {e}</li>)}
                </ul>
              )}
            </div>
          )}

          {mode === 'resetConfirm' && (
            <>
              <div>
                <label className="label">Reset Token</label>
                <input type="text" className="input" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required placeholder="Paste reset token" />
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className={`input pr-10 ${validationErrors.password ? 'border-red-500' : ''}`} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); checkStrength(e.target.value); }} required placeholder="••••••••" minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {Array(6).fill(0).map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < passwordStrength.strength ? strengthColors[passwordStrength.strength] : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{passwordStrength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" className={`input ${validationErrors.confirm ? 'border-red-500' : ''}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" minLength={8} />
                {validationErrors.confirm && <p className="text-xs text-red-600 mt-1">{validationErrors.confirm}</p>}
              </div>
            </>
          )}

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">{success}</div>}

          <button type="submit" disabled={loading} className="w-full btn btn-primary py-3">
            {loading ? 'Please wait...' :
              mode === 'login' ? 'Sign In' :
              mode === 'register' ? 'Create Account' :
              mode === 'reset' ? 'Send Reset Link' :
              'Reset Password'}
          </button>
        </form>

        {mode === 'login' && (
          <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }} className="block w-full text-center mt-3 text-sm text-indigo-600 hover:text-indigo-800">
            Forgot your password?
          </button>
        )}

        <div className="mt-4 text-center">
          {mode === 'login' && (
            <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Don't have an account? Sign up
            </button>
          )}
          {mode === 'register' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              Already have an account? Sign in
            </button>
          )}
        </div>

        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button type="button" onClick={() => { setEmail('admin@cateringpro.com'); setPassword('password123'); }} className="w-full mb-4 btn bg-gray-100 text-gray-700 hover:bg-gray-200 py-3">
              Use Demo Login (Admin)
            </button>
            <p className="text-xs text-gray-500 text-center mb-3">Other Demo Accounts (all use password123):</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('admin@cateringpro.com'); setPassword('password123'); }}>
                <strong>Admin:</strong><br />admin@cateringpro.com
              </div>
              <div className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('sarah@cateringpro.com'); setPassword('password123'); }}>
                <strong>Manager:</strong><br />sarah@cateringpro.com
              </div>
              <div className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('john@smithwedding.com'); setPassword('password123'); }}>
                <strong>Client:</strong><br />john@smithwedding.com
              </div>
              <div className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" onClick={() => { setEmail('chef.alex@cateringpro.com'); setPassword('password123'); }}>
                <strong>Staff:</strong><br />chef.alex@cateringpro.com
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
