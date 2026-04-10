import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { updateDisplayName, updateUserPassword } from '../services/authService';

export default function Profile() {
  const { user } = useAuth();
  const { showToast } = useUI();

  // Name update state
  const [newName, setNewName] = useState(user?.displayName || '');
  const [updatingName, setUpdatingName] = useState(false);

  // Password update state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleNameChange = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Please enter a valid name', 'warning');
      return;
    }

    if (newName === user?.displayName) {
      showToast('Please enter a different name', 'warning');
      return;
    }

    setUpdatingName(true);
    try {
      await updateDisplayName(newName);
      showToast('✨ Display name updated successfully!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
      setNewName(user?.displayName || '');
    } finally {
      setUpdatingName(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.currentPassword) {
      showToast('Please enter your current password', 'warning');
      return;
    }

    if (!passwordForm.newPassword) {
      showToast('Please enter a new password', 'warning');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'warning');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'warning');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      showToast('New password must be different from current password', 'warning');
      return;
    }

    setUpdatingPassword(true);
    try {
      await updateUserPassword(passwordForm.currentPassword, passwordForm.newPassword);
      showToast('🔐 Password updated successfully!', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24">
      {/* Header */}
      <div className="bg-primary-container border-b-4 border-black px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-headline font-black text-6xl uppercase text-black mb-2 italic">
            👤 Your Profile
          </h1>
          <p className="font-body text-xl text-black">Manage your account settings</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Account Info Card */}
        <div className="bg-white border-4 border-black p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-8">
          <h2 className="font-headline font-black text-4xl uppercase text-black mb-6 border-b-4 border-black pb-4">
            Account Information
          </h2>

          <div className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block font-label font-black text-sm uppercase text-black mb-3">
                📧 Email Address
              </label>
              <div className="px-4 py-3 bg-surface border-3 border-black font-body text-on-surface">
                {user?.email}
              </div>
              <p className="font-label text-xs uppercase text-on-surface-variant mt-2">Email cannot be changed</p>
            </div>

            {/* Display Name */}
            <form onSubmit={handleNameChange}>
              <label className="block font-label font-black text-sm uppercase text-black mb-3">
                👤 Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  placeholder="Enter your name"
                />
                <button
                  type="submit"
                  disabled={updatingName}
                  className="px-6 py-3 bg-primary-container text-black font-headline font-black border-4 border-black uppercase text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {updatingName ? '⏳' : '✨'} Update
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white border-4 border-black p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <h2 className="font-headline font-black text-4xl uppercase text-black mb-6 border-b-4 border-black pb-4">
            🔐 Security
          </h2>

          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-8 py-4 bg-secondary-container text-black font-headline font-black border-4 border-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
            >
              🔑 Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block font-label font-black text-sm uppercase text-black mb-3">
                  Current Password *
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  placeholder="Enter your current password"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block font-label font-black text-sm uppercase text-black mb-3">
                  New Password *
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  placeholder="Enter your new password"
                />
                <p className="font-label text-xs uppercase text-on-surface-variant mt-2">
                  Minimum 6 characters
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block font-label font-black text-sm uppercase text-black mb-3">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  placeholder="Confirm your new password"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex-1 px-6 py-3 bg-secondary-container text-black font-headline font-black border-4 border-black uppercase text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {updatingPassword ? '⏳' : '🔐'} Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-surface text-black font-headline font-black border-4 border-black uppercase text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
