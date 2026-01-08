import { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  User,
  Shield,
  FileText,
  Activity,
  Edit2,
  Save,
  X,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Smartphone,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  role: string;
  status: string;
  emailVerified: boolean;
  kycStatus: string;
  kycDocuments?: any;
  kycVerifiedAt?: string;
  kycRejectionReason?: string;
  twoFactorEnabled: boolean;
  referralCode: string;
  wallets: any[];
  referralCount: number;
  affiliate?: any;
  createdAt: string;
}

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'personal' | 'kyc' | 'security' | 'activity'>('personal');

  // Personal Info editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // KYC upload
  const [kycForm, setKycForm] = useState({
    documentType: 'PASSPORT',
    documentNumber: '',
    frontImage: '',
    backImage: '',
    selfieImage: '',
  });
  const [uploadingKYC, setUploadingKYC] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      loadSessions();
    } else if (activeTab === 'activity') {
      loadActivity();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      setProfile(response.data.data);
      setEditForm({
        firstName: response.data.data.firstName || '',
        lastName: response.data.data.lastName || '',
        phone: response.data.data.phone || '',
        country: response.data.data.country || '',
        city: response.data.data.city || '',
        address: response.data.data.address || '',
        dateOfBirth: response.data.data.dateOfBirth ? response.data.data.dateOfBirth.split('T')[0] : '',
      });
    } catch (error: any) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await profileAPI.getSessions();
      setSessions(response.data.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await profileAPI.getActivity(100);
      setActivityLogs(response.data.data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await profileAPI.updateProfile(editForm);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleUploadKYC = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kycForm.frontImage) {
      toast.error('Please upload front image of your document');
      return;
    }

    try {
      setUploadingKYC(true);
      await profileAPI.uploadKYC(kycForm);
      toast.success('KYC documents submitted! Awaiting verification.');
      loadProfile();
      setKycForm({
        documentType: 'PASSPORT',
        documentNumber: '',
        frontImage: '',
        backImage: '',
        selfieImage: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload KYC');
    } finally {
      setUploadingKYC(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      await profileAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    try {
      await profileAPI.revokeSession(sessionId);
      toast.success('Session revoked');
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will remain logged in on this device.'))
      return;

    try {
      const response = await profileAPI.revokeAllSessions();
      toast.success(response.data.message);
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke sessions');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      NONE: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: AlertCircle },
      PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
      VERIFIED: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-500/10', text: 'text-red-500', icon: XCircle },
    };

    const style = styles[status] || styles.NONE;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-4 h-4" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your personal information, KYC, and security settings</p>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-400 mb-3">{profile.email}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Role:</span>
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-sm">{profile.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">KYC:</span>
                  {getStatusBadge(profile.kycStatus)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">2FA:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    profile.twoFactorEnabled
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex gap-6">
            {[
              { key: 'personal', label: 'Personal Info', icon: User },
              { key: 'kyc', label: 'KYC Verification', icon: FileText },
              { key: 'security', label: 'Security', icon: Shield },
              { key: 'activity', label: 'Activity Log', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 pb-4 px-2 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-500 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Personal Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.firstName || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.lastName || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Email</label>
                <p className="text-white py-3">{profile.email}</p>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.phone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Country</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.country || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.city || '-'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 mb-2 text-sm">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">{profile.address || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white py-3">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-2 text-sm">Referral Code</label>
                <p className="text-white py-3 font-mono">{profile.referralCode}</p>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateProfile}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">KYC Verification</h3>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-gray-400">Current Status:</span>
                {getStatusBadge(profile.kycStatus)}
              </div>

              {profile.kycStatus === 'VERIFIED' && profile.kycVerifiedAt && (
                <p className="text-gray-400 text-sm">
                  Verified on {new Date(profile.kycVerifiedAt).toLocaleDateString()}
                </p>
              )}

              {profile.kycStatus === 'REJECTED' && profile.kycRejectionReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                  <p className="text-red-500 font-semibold mb-2">Rejection Reason:</p>
                  <p className="text-gray-300">{profile.kycRejectionReason}</p>
                </div>
              )}
            </div>

            {profile.kycStatus === 'NONE' || profile.kycStatus === 'REJECTED' ? (
              <form onSubmit={handleUploadKYC} className="space-y-6">
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Document Type</label>
                  <select
                    value={kycForm.documentType}
                    onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driver's License</option>
                    <option value="NATIONAL_ID">National ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Document Number</label>
                  <input
                    type="text"
                    value={kycForm.documentNumber}
                    onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Front Image URL</label>
                  <input
                    type="url"
                    value={kycForm.frontImage}
                    onChange={(e) => setKycForm({ ...kycForm, frontImage: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Back Image URL (Optional)</label>
                  <input
                    type="url"
                    value={kycForm.backImage}
                    onChange={(e) => setKycForm({ ...kycForm, backImage: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Selfie Image URL (Optional)</label>
                  <input
                    type="url"
                    value={kycForm.selfieImage}
                    onChange={(e) => setKycForm({ ...kycForm, selfieImage: e.target.value })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingKYC}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingKYC ? 'Uploading...' : 'Submit KYC Documents'}
                </button>
              </form>
            ) : (
              <div className="bg-gray-900/50 rounded-lg p-6 text-center">
                <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-white text-lg mb-2">Your KYC documents are under review</p>
                <p className="text-gray-400">We'll notify you once verification is complete</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-blue-500"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Active Sessions */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Active Sessions</h3>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeAllSessions}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    Revoke All Others
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-900/50 rounded-lg p-4 flex items-start justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <Smartphone className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-white font-medium">{session.userAgent}</p>
                        <p className="text-gray-400 text-sm">IP: {session.ipAddress}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Created: {new Date(session.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Activity Log</h3>

            <div className="space-y-3">
              {activityLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No activity logs yet</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="bg-gray-900/50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{log.action.replace(/_/g, ' ')}</p>
                        {log.entity && (
                          <p className="text-gray-400 text-sm">
                            {log.entity} {log.entityId}
                          </p>
                        )}
                        {log.ipAddress && (
                          <p className="text-gray-500 text-xs mt-1">IP: {log.ipAddress}</p>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
