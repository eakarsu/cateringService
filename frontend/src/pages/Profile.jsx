import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { User, Lock, Mail, Phone, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth();
  const toast = useToast();
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfileInfo(res.data);
      setProfileData({ name: res.data.name, email: res.data.email, phone: res.data.phone || '' });
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', profileData);
      setProfileInfo(res.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(null);
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const checkPasswordStrength = async (password) => {
    if (!password) { setPasswordStrength(null); return; }
    try {
      const res = await api.post('/auth/check-password-strength', { password });
      setPasswordStrength(res.data);
    } catch {
      // ignore
    }
  };

  const strengthColors = {
    0: 'bg-gray-200', 1: 'bg-red-500', 2: 'bg-orange-500',
    3: 'bg-yellow-500', 4: 'bg-lime-500', 5: 'bg-green-500', 6: 'bg-green-600'
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            {profileInfo?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{profileInfo?.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield size={14} />
              <span>{profileInfo?.role}</span>
              {profileInfo?.emailVerified ? (
                <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Verified</span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600"><XCircle size={14} /> Not Verified</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" className="input" style={{ paddingLeft: '2.5rem' }} value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="email" className="input" style={{ paddingLeft: '2.5rem' }} value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="tel" className="input" style={{ paddingLeft: '2.5rem' }} value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={passwordData.newPassword} onChange={(e) => { setPasswordData({ ...passwordData, newPassword: e.target.value }); checkPasswordStrength(e.target.value); }} required minLength={8} />
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < passwordStrength.strength ? strengthColors[passwordStrength.strength] : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength.strength >= 4 ? 'text-green-600' : passwordStrength.strength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {passwordStrength.label}
                </p>
                {passwordStrength.feedback?.length > 0 && (
                  <ul className="text-xs text-gray-500 mt-1">
                    {passwordStrength.feedback.map((f, i) => <li key={i}>- {f}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required minLength={8} />
            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={passwordLoading || (passwordData.newPassword !== passwordData.confirmPassword)}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
