import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Shield, Database, HelpCircle,
  Smartphone, Globe, Download, Trash2, LogOut,
  Monitor, Save, X, Zap, Plus, X as XIcon, Calendar as CalendarIcon
} from 'lucide-react';
import { auth, db } from '@/services/firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { toast } from 'sonner';
import { useUI } from '@/context/UIContext';
import { connectGoogleCalendar, fetchUpcomingEvents } from "@/services/googleCalendar";
import { releaseNotes, getVersion } from '@/data/releaseNotes';
import './SettingsPage.scss';

export default function SettingsPage() {
  const user = auth.currentUser;
  const uid = user?.uid;
  const { showMusicPlayer, setShowMusicPlayer } = useUI();

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

  // Additional Emails State
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Google Sync State
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);

  // Microsoft Sync
  const handleSyncOutlook = async () => {
    try {
      setIsSyncingOutlook(true);
      // We just connect here, the actual fetching happens in the respective components (Timetable/Todo)
      // or we can store the token/status here if we want to trigger a global fetch.
      // For now, let's just authenticate to ensure we have permissions.
      const token = await import("@/services/microsoftIntegration").then(m => m.connectMicrosoft());
      
      // Optionally fetch immediately to cache or verify
      await import("@/services/microsoftIntegration").then(m => m.fetchOutlookEvents(token));
      
      toast.success("Connected to Outlook!");
    } catch (err) {
      toast.error("Failed to connect Outlook");
      console.error(err);
    } finally {
      setIsSyncingOutlook(false);
    }
  };


  // Track initial settings for dirty checking
  const [initialSettings, setInitialSettings] = useState<any>(null);

  // Load settings from Firebase
  useEffect(() => {
    if (!uid) return;
    const settingsRef = ref(db, `users/${uid}/settings`);
    const unsub = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedSettings = {
          notifications: data.notifications || settings.notifications,
          privacy: data.privacy || settings.privacy,
        };

        // Merge with current state structure to ensure we have all fields
        const mergedSettings = {
          notifications: { ...settings.notifications, ...loadedSettings.notifications },
          privacy: { ...settings.privacy, ...loadedSettings.privacy }
        };

        setSettings(mergedSettings);
        setInitialSettings(mergedSettings);
      } else {
        // If no data, current defaults are initial
        setInitialSettings(settings);
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

      setInitialSettings(settings); // Update initial settings to match current (clean state)
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Check for changes
  // We exclude interface settings from this check as they are local/UIContext only for now? 
  // Wait, user might want to save them? The interface toggle currently updates context instantly.
  // The 'Save' button is primarily for the Firebase settings (Notifications/Privacy).
  // Let's rely on JSON comparison for simplicity.
  const hasChanges = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings);

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
    // ... existing logic ...
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

  // --- MIGRATED HANDLERS ---

  // Load Additional Emails
  useEffect(() => {
    if (!uid) return;
    const emailsRef = ref(db, `users/${uid}/settings/additionalEmails`);
    const unsub = onValue(emailsRef, (snap) => {
      setAdditionalEmails(snap.val() || []);
    });
    return () => unsub();
  }, [uid]);

  const handleAddEmail = async () => {
    if (!newEmailInput.trim() || !newEmailInput.includes('@')) return;
    setIsAddingEmail(true);
    try {
      const updated = [...additionalEmails, newEmailInput.trim()];
      await update(ref(db, `users/${uid}/settings`), {
        additionalEmails: updated
      });
      setNewEmailInput("");
      toast.success("Email added successfully");
    } catch (err) {
      toast.error("Failed to add email");
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    try {
      const updated = additionalEmails.filter(e => e !== emailToRemove);
      await update(ref(db, `users/${uid}/settings`), {
        additionalEmails: updated
      });
      toast.success("Email removed");
    } catch (err) {
      toast.error("Failed to remove email");
    }
  };

  // Google Calendar Sync
  const handleSyncGoogle = async () => {
    try {
      setIsSyncingCalendar(true);
      const token = await connectGoogleCalendar();
      await fetchUpcomingEvents(token);
      toast.success("Synced with Google Calendar!");
    } catch (err) {
      toast.error("Failed to sync Google Calendar");
      console.error(err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Phone Verification
  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier.clear();
      (window as any).recaptchaVerifier = null;
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => { },
      "expired-callback": () => { }
    });
  };

  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    }
  }, []);

  const handleSendPhoneCode = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      (window as any).confirmationResult = confirmationResult;
      setVerificationId(confirmationResult.verificationId);
      setIsVerifyingPhone(true);
      toast.success("Verification code sent!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    setLoading(true);
    try {
      if (!(window as any).confirmationResult) throw new Error("No verification session");
      // Link with phone
      const credential = PhoneAuthProvider.credential(
        (window as any).confirmationResult.verificationId,
        verificationCode
      );
      if (auth.currentUser) {
        await linkWithCredential(auth.currentUser, credential);
        toast.success("Phone verified & linked!");
        setIsVerifyingPhone(false);
        setVerificationCode("");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Invalid code");
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
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account preferences and app settings</p>
        </header>

        <div className="settings-grid">
          {/* Interface Section */}
          <section className="settings-section">
            <div className="section-header">
              <Monitor size={20} />
              <h2>Interface</h2>
            </div>
            <div className="section-body">
              <div className="setting-item">
                <div>
                  <div className="setting-title">Show Music Player</div>
                  <div className="setting-description">Display the global music player</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showMusicPlayer}
                    onChange={(e) => setShowMusicPlayer(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="settings-section">
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
          </section>

          {/* Privacy Section */}
          <section className="settings-section">
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
          </section>

          {/* Security Section */}
          <section className="settings-section">
            <div className="section-header">
              <Lock size={20} />
              <h2>Security</h2>
            </div>
            <div className="section-body">
              {/* Password Info */}
              <div className="setting-item">
                <div>
                  <div className="setting-title">Change Password</div>
                  <div className="setting-description">Update your login password</div>
                </div>
              </div>
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

              <div className="divider" />

              {/* Phone Verification */}
              <div className="setting-item">
                <div>
                  <div className="setting-title">Phone Verification</div>
                  <div className="setting-description">Link a phone number for recovery</div>
                </div>
              </div>
              <div className="password-inputs">
                {!isVerifyingPhone ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="setting-input"
                      placeholder="+1 555 555 5555"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <button className="btn secondary" onClick={handleSendPhoneCode} disabled={loading}>
                      Send Code
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="setting-input"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <button className="btn primary" onClick={handleVerifyPhoneCode} disabled={loading}>
                      Verify
                    </button>
                    <button className="btn ghost" onClick={() => setIsVerifyingPhone(false)}>Cancel</button>
                  </div>
                )}
                <div id="recaptcha-container"></div>
              </div>
            </div>
          </section>

          {/* Integrations Section */}
          <section className="settings-section">
            <div className="section-header">
              <Globe size={20} />
              <h2>Integrations</h2>
            </div>
            <div className="section-body">
              <div className="setting-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <CalendarIcon size={24} className="text-secondary" />
                  <div>
                    <div className="setting-title">Google Calendar & Tasks</div>
                    <div className="setting-description">Sync upcoming events and tasks</div>
                  </div>
                </div>
                <button className="btn secondary" onClick={handleSyncGoogle} disabled={isSyncingCalendar}>
                  {isSyncingCalendar ? "Syncing..." : "Sync Google"}
                </button>
              </div>

              <div className="setting-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" 
                    alt="Outlook" 
                    style={{ width: 24, height: 24 }} 
                  />
                  <div>
                    <div className="setting-title">Outlook Calendar & To Do</div>
                    <div className="setting-description">Sync events and tasks from Microsoft</div>
                  </div>
                </div>
                <button className="btn secondary" onClick={handleSyncOutlook} disabled={isSyncingOutlook}>
                  {isSyncingOutlook ? "Syncing..." : "Sync Outlook"}
                </button>
              </div>
            </div>
          </section>

          {/* Account Details Section */}
          <section className="settings-section">
            <div className="section-header">
              <User size={20} />
              <h2>Account Details</h2>
            </div>
            <div className="section-body">
              <label className="setting-label">Additional Emails</label>
              <div className="password-inputs">
                {additionalEmails.map(email => (
                  <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                    <span>{email}</span>
                    <button onClick={() => handleRemoveEmail(email)} className="btn danger" style={{ padding: '0.25rem 0.5rem' }}>
                      <XIcon size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="setting-input"
                    placeholder="Add secondary email..."
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                  />
                  <button className="btn secondary" onClick={handleAddEmail} disabled={isAddingEmail}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Data Management Section */}
          <section className="settings-section">
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
          </section>

          {/* About Section */}
          <section className="settings-section">
            <div className="section-header">
              <HelpCircle size={20} />
              <h2>About</h2>
            </div>
            <div className="section-body">
              <div className="about-row">
                <span>Version</span>
                <span>{getVersion()}</span>
              </div>
              <div className="about-row">
                <span>Build</span>
                <span>{__BUILD_DATE__}</span>
              </div>
              <div className="divider" />
              <a href="https://github.com/socom1/unifystudy" target="_blank" rel="noopener noreferrer" className="about-link">
                GitHub Repository
              </a>
              <a href="https://github.com/socom1/unifystudy/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="about-link">
                License
              </a>
              <Link to="/privacy" className="about-link">
                Privacy Policy
              </Link>
              <Link to="/terms" className="about-link">
                Terms of Service
              </Link>
            </div>
          </section>
        </div>

        {/* Sticky Save Button - Only show when changes exist */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              className="settings-actions"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <button className="btn primary large" onClick={saveSettings} disabled={loading}>
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
