import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Lock, Bell, Shield, Database, HelpCircle,
  Mail, Smartphone, Globe, Download, Trash2, LogOut,
  Sun, Moon, Monitor, Save, X
} from 'lucide-react';
import { auth, db } from '@/services/firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  deleteUser 
} from 'firebase/auth';
import { toast } from 'sonner';
import './SettingsPage.scss';

export default function SettingsPage() {
  const user = auth.currentUser;
  const uid = user?.uid;

  // Settings State
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      taskReminders: true,
      studyReminders: true,
      achievements: true,
    },
    privacy: {
      anonymousMode: false,
      showOnLeaderboard: true,
      shareStats: true,
    },
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Load settings from Firebase
  useEffect(() => {
    if (!uid) return;
    const settingsRef = ref(db, `users/${uid}/settings`);
    const unsub = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(prev => ({
          ...prev,
          notifications: data.notifications || prev.notifications,
          privacy: data.privacy || prev.privacy,
        }));
      }
    });
    return () => unsub();
  }, [uid]);

  // Save Settings
  const saveSettings = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      await update(ref(db, `users/${uid}/settings`), {
        notifications: settings.notifications,
        privacy: settings.privacy,
      });
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!user?.email) {
      toast.error('No email associated with this account');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Export Data
  const handleExportData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await new Promise<any>((resolve) => {
        onValue(userRef, resolve, { onlyOnce: true });
      });
      
      const data = snapshot.val();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `unifystudy-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;

    const password = window.prompt('Please enter your password to confirm:');
    if (!password) return;

    setLoading(true);
    try {
      if (!user?.email) throw new Error('No email found');
      
      // Reauthenticate
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Mark as deleted in database
      if (uid) {
        await update(ref(db, `users/${uid}`), { deleted: true });
      }
      
      // Delete user
      await deleteUser(user);
      
      toast.success('Account deleted');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <motion.div
        className="settings-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences and app settings</p>
        </header>

        <div className="settings-grid">
          {/* Notifications Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="section-header">
              <Bell size={20} />
              <h2>Notifications</h2>
            </div>
            <div className="section-body">
              <div className="setting-item">
                <div>
                  <div className="setting-title">Email Notifications</div>
                  <div className="setting-description">Receive updates via email</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div>
                  <div className="setting-title">Task Reminders</div>
                  <div className="setting-description">Get notified about upcoming tasks</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.taskReminders}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, taskReminders: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div>
                  <div className="setting-title">Study Reminders</div>
                  <div className="setting-description">Reminders for study sessions</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.studyReminders}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, studyReminders: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div>
                  <div className="setting-title">Achievement Notifications</div>
                  <div className="setting-description">Celebrate your accomplishments</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.achievements}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, achievements: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </motion.section>

          {/* Privacy Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="section-header">
              <Shield size={20} />
              <h2>Privacy</h2>
            </div>
            <div className="section-body">
              <div className="setting-item">
                <div>
                  <div className="setting-title">Anonymous Mode</div>
                  <div className="setting-description">Hide your identity on leaderboards</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.privacy.anonymousMode}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, anonymousMode: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div>
                  <div className="setting-title">Show on Leaderboard</div>
                  <div className="setting-description">Appear in global rankings</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.privacy.showOnLeaderboard}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, showOnLeaderboard: e.target.checked }
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </motion.section>

          {/* Security Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="section-header">
              <Lock size={20} />
              <h2>Security</h2>
            </div>
            <div className="section-body">
              <label className="setting-label">Change Password</label>
              <div className="password-inputs">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="setting-input"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="setting-input"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="setting-input"
                />
                <button
                  className="btn primary"
                  onClick={handleChangePassword}
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </motion.section>

          {/* Data Management Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="section-header">
              <Database size={20} />
              <h2>Data Management</h2>
            </div>
            <div className="section-body">
              <button className="btn secondary full-width" onClick={handleExportData} disabled={loading}>
                <Download size={16} />
                Export My Data
              </button>
              <p className="setting-description" style={{ marginTop: '0.5rem' }}>
                Download all your data in JSON format
              </p>

              <div className="divider" />

              <button className="btn danger full-width" onClick={handleDeleteAccount} disabled={loading}>
                <Trash2 size={16} />
                Delete Account
              </button>
              <p className="setting-description danger" style={{ marginTop: '0.5rem' }}>
                Permanently delete your account and all associated data
              </p>
            </div>
          </motion.section>

          {/* About Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="section-header">
              <HelpCircle size={20} />
              <h2>About</h2>
            </div>
            <div className="section-body">
              <div className="about-row">
                <span>Version</span>
                <span>1.0.0</span>
              </div>
              <div className="about-row">
                <span>Build</span>
                <span>2024.12.28</span>
              </div>
              <div className="divider" />
              <a href="https://github.com/unifystudy" target="_blank" rel="noopener noreferrer" className="about-link">
                GitHub Repository
              </a>
              <a href="/privacy" className="about-link">
                Privacy Policy
              </a>
              <a href="/terms" className="about-link">
                Terms of Service
              </a>
            </div>
          </motion.section>
        </div>

        {/* Sticky Save Button */}
        <div className="settings-actions">
          <button className="btn primary large" onClick={saveSettings} disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
