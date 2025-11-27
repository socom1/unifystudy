import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, set, onValue } from "firebase/database";
import { updateProfile, updatePassword, deleteUser } from "firebase/auth";
import { Bell, User, Lock, Palette, Info, Trash2 } from "lucide-react";
import "./Settings.scss";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    theme: "dark",
    anonymousMode: false,
    emailNotifications: true,
    pushNotifications: false,
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // Load user & settings
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        const settingsRef = ref(db, `users/${u.uid}/settings`);
        onValue(settingsRef, (snap) => {
          const val = snap.val();
          if (val) {
            setSettings({
              theme: val.theme || "dark",
              anonymousMode: val.anonymousMode || false,
              emailNotifications: val.emailNotifications !== false,
              pushNotifications: val.pushNotifications || false,
            });
          }
        });
      }
    });
    return unsubscribe;
  }, []);

  const saveSettings = async () => {
    if (!user) return;
    try {
      await set(ref(db, `users/${user.uid}/settings`), settings);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords don't match!");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters!");
      return;
    }
    try {
      await updatePassword(user, newPassword);
      setMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Error: " + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure? This action cannot be undone!")) {
      try {
        await deleteUser(user);
        setMessage("Account deleted.");
      } catch (err) {
        setMessage("Error: " + err.message);
      }
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-empty">
          <User size={48} />
          <p>Please log in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>&gt;_ Settings</h1>
        <p className="subtitle">Configure your UnifyStudy experience</p>
      </div>

      {message && (
        <div className="settings-message">
          {message}
        </div>
      )}

      <div className="settings-container">
        {/* Appearance Section */}
        <div className="settings-section">
          <div className="section-header">
            <Palette size={20} />
            <h2>Appearance</h2>
          </div>
          <div className="setting-item">
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({ ...settings, theme: e.target.value })
              }
            >
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="terminal">Terminal Green</option>
            </select>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>
          <div className="setting-item checkbox-item">
            <input
              type="checkbox"
              id="email-notif"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
            />
            <label htmlFor="email-notif">Email Notifications</label>
          </div>
          <div className="setting-item checkbox-item">
            <input
              type="checkbox"
              id="push-notif"
              checked={settings.pushNotifications}
              onChange={(e) =>
                setSettings({ ...settings, pushNotifications: e.target.checked })
              }
            />
            <label htmlFor="push-notif">Push Notifications</label>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="settings-section">
          <div className="section-header">
            <Lock size={20} />
            <h2>Privacy</h2>
          </div>
          <div className="setting-item checkbox-item">
            <input
              type="checkbox"
              id="anonymous"
              checked={settings.anonymousMode}
              onChange={(e) =>
                setSettings({ ...settings, anonymousMode: e.target.checked })
              }
            />
            <label htmlFor="anonymous">Remain Anonymous on Leaderboard</label>
          </div>
        </div>

        {/* Account Section */}
        <div className="settings-section">
          <div className="section-header">
            <User size={20} />
            <h2>Account</h2>
          </div>
          <div className="setting-item">
            <label>Email</label>
            <input type="text" value={user.email || ""} disabled />
          </div>
          <div className="setting-item">
            <label>Display Name</label>
            <input
              type="text"
              value={user.displayName || ""}
              onChange={(e) => {
                updateProfile(user, { displayName: e.target.value });
              }}
            />
          </div>
          <div className="setting-item">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button className="btn-change-password" onClick={handlePasswordChange}>
            Change Password
          </button>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <div className="section-header">
            <Trash2 size={20} />
            <h2>Danger Zone</h2>
          </div>
          <p className="danger-text">
            Once you delete your account, there is no going back.
          </p>
          <button className="btn-delete" onClick={handleDeleteAccount}>
            Delete Account
          </button>
        </div>

        {/* Save Button */}
        <div className="settings-actions">
          <button className="btn-save" onClick={saveSettings}>
            Save All Changes
          </button>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <div className="section-header">
            <Info size={20} />
            <h2>About</h2>
          </div>
          <div className="about-info">
            <p><strong>UnifyStudy</strong></p>
            <p>Version 1.0.0</p>
            <p className="muted">Built with React & Firebase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
