// /mnt/data/profile.jsx
// Upgraded Profile page — Developer-dashboard + Glass UI
// Features:
// - Verification widget (send verification email)
// - Avatar upload (uses firebase storage if available)
// - Account security (change password, reauthenticate, delete account)
// - Session info (placeholder — extend with real session listing if available)
// - Profile completeness indicator
// - Framer-motion friendly buttons (AnimatePresence + motion used lightly)
// - Expects ../firebase to export: auth, db, (optional) storage
//
// Usage: replace your existing profile.jsx with this file.
// Make sure ../firebase exports auth and db (and storage if using avatar upload to cloud).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase"; // adjust if your file exports differently
import {
  updateProfile as fbUpdateProfile,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as fbUpdatePassword,
  deleteUser as fbDeleteUser,
  signOut as fbSignOut,
} from "firebase/auth";
import { ref as dbRef, update as dbUpdate, onValue } from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import "./profile.scss"; // companion SCSS (below)

export default function ProfilePage() {
  const user = auth.currentUser;
  const uid = user?.uid ?? null;

  // Local UI state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [emailVerified, setEmailVerified] = useState(
    user?.emailVerified || false
  );

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Anonymous mode state
  const [anonymousMode, setAnonymousMode] = useState(false);

  // Customization state
  const [ownedTags, setOwnedTags] = useState([]);
  const [ownedBanners, setOwnedBanners] = useState([]);
  const [ownedThemes, setOwnedThemes] = useState(["default"]);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedBanner, setSelectedBanner] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");

  const presetBanners = [
    { id: "gradient-1", name: "Ocean", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { id: "gradient-2", name: "Sunset", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { id: "gradient-3", name: "Forest", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { id: "gradient-4", name: "Aurora", gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  ];

  // Fetch settings including anonymous mode
  useEffect(() => {
    if (uid) {
      const settingsRef = dbRef(db, `users/${uid}/settings`);
      const unsub = onValue(settingsRef, (snapshot) => {
        const val = snapshot.val() || {};
        setNotificationsEnabled(val.notifications !== false);
        setAnonymousMode(val.anonymousMode === true);
        // Also fetch theme if it's stored here, though we fetch it in customization below too.
        // Let's rely on the customization listener for theme to be safe.
      });
      return () => unsub();
    }
  }, [uid]);

  const toggleNotifications = async () => {
    if (!uid) return;
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue); // Optimistic update
    try {
      await dbUpdate(dbRef(db, `users/${uid}/settings`), { notifications: newValue });
      setTempStatus(`Notifications ${newValue ? "enabled" : "disabled"}`);
    } catch (err) {
      console.error(err);
      setNotificationsEnabled(!newValue); // Revert
      setErrorMsg("Failed to update settings");
    }
  };

  const toggleAnonymousMode = async () => {
    if (!uid) return;
    const newValue = !anonymousMode;
    setAnonymousMode(newValue);
    try {
      await dbUpdate(dbRef(db, `users/${uid}/settings`), { anonymousMode: newValue });
      setTempStatus(`Anonymous mode ${newValue ? "enabled" : "disabled"}`);
    } catch (err) {
      console.error(err);
      setAnonymousMode(!newValue);
      setErrorMsg("Failed to update settings");
    }
  };

  // Fetch owned items and current customization
  useEffect(() => {
    if (!uid) return;
    
    // Fetch owned tags
    const tagsRef = dbRef(db, `users/${uid}/unlockedTags`);
    const unsubTags = onValue(tagsRef, (snap) => {
      setOwnedTags(snap.val() || []);
    });

    // Fetch owned themes
    const themesRef = dbRef(db, `users/${uid}/unlockedThemes`);
    const unsubThemes = onValue(themesRef, (snap) => {
      setOwnedThemes(snap.val() || ["default"]);
    });

    // Fetch current customization
    const customRef = dbRef(db, `users/${uid}/settings/customization`);
    const unsubCustom = onValue(customRef, (snap) => {
      const data = snap.val();
      setSelectedTag(data?.profileTag || "");
      setSelectedBanner(data?.profileBanner || "gradient-1");
      setSelectedTheme(data?.theme || "default");
    });

    return () => {
      unsubTags();
      unsubThemes();
      unsubCustom();
    };
  }, [uid]);

  // Avatar upload
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Profile completeness
  const completeness = useMemo(() => {
    let score = 0;
    if (displayName) score += 30;
    if (email) score += 30;
    if (photoURL) score += 40;
    return Math.min(100, score);
  }, [displayName, email, photoURL]);

  // watch for auth changes (emailVerified may update after verification)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setEmailVerified(!!u?.emailVerified);
      setDisplayName(u?.displayName || "");
      setEmail(u?.email || "");
      setPhotoURL(u?.photoURL || "");
    });
    return () => unsub();
  }, []);

  // helpers
  const setTempStatus = (msg, ms = 3500) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), ms);
  };

  // Save basic profile (displayName + photoURL + optional DB mirror)
  const saveProfile = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const updateObj = {};
      if (displayName !== user?.displayName)
        updateObj.displayName = displayName;
      if (photoURL && photoURL !== user?.photoURL)
        updateObj.photoURL = photoURL;

      if (Object.keys(updateObj).length > 0) {
        await fbUpdateProfile(auth.currentUser, updateObj);
      }
      // Optionally mirror to Realtime DB (if you keep a users node)
      if (uid) {
        await dbUpdate(dbRef(db, `users/${uid}`), {
          displayName: displayName || null,
          photoURL: photoURL || null,
        });
      }
      setTempStatus("Profile saved");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  // Send verification email
  const handleSendVerification = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("No authenticated user");
      await sendEmailVerification(auth.currentUser);
      setTempStatus("Verification email sent — check your inbox");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to send verification");
    } finally {
      setLoading(false);
    }
  };

  // Change password (requires reauth sometimes)
  const handleChangePassword = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (!auth.currentUser || !auth.currentUser.email)
        throw new Error("No authenticated user");
      // try updatePassword directly (may require recent login)
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      try {
        // reauthenticate and then update
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (reauthError) {
        // If reauth fails, mark required
        setReauthRequired(true);
        throw new Error(
          "Reauthentication failed — please confirm your current password"
        );
      }
      // now update
      await fbUpdatePassword(auth.currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setTempStatus("Password changed");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  // Avatar upload handler
  const handleAvatarPick = async (file) => {
    setErrorMsg("");
    setLoading(true);
    try {
      if (!file) throw new Error("No file selected");
      // If you exported storage in ../firebase, we use Firebase Storage to upload
      if (storage) {
        const sRef = storageRef(
          storage,
          `users/${uid}/avatar-${Date.now()}-${file.name}`
        );
        const uploadTask = uploadBytesResumable(sRef, file);
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(pct);
          },
          (err) => {
            console.error(err);
            setErrorMsg("Upload failed");
            setLoading(false);
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setPhotoURL(url);
            // reflect back to user profile
            await fbUpdateProfile(auth.currentUser, { photoURL: url });
            // mirror to DB
            if (uid)
              await dbUpdate(dbRef(db, `users/${uid}`), { photoURL: url });
            setUploadProgress(0);
            setTempStatus("Avatar uploaded");
            setLoading(false);
          }
        );
      } else {
        // If no storage configured, use local preview and require manual hosting
        const reader = new FileReader();
        reader.onload = () => {
          setPhotoURL(reader.result);
          setTempStatus("Avatar set (local preview)");
          setLoading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Avatar upload error");
      setLoading(false);
    }
  };

  // Delete account (reauth required)
  const handleDeleteAccount = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      // require current password to reauthenticate
      if (!auth.currentUser || !auth.currentUser.email)
        throw new Error("No user");
      const pw = prompt(
        "To delete your account, please enter your current password:"
      );
      if (!pw) throw new Error("Password required for deletion");
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        pw
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      // optional: remove user data in database before deletion
      if (uid) {
        try {
          await dbUpdate(dbRef(db, `users/${uid}`), { deleted: true });
        } catch (dbErr) {
          console.warn("Failed to mark DB deleted:", dbErr);
        }
      }
      await fbDeleteUser(auth.currentUser);
      setTempStatus("Account deleted");
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const saveCustomization = async () => {
    if (!uid) return;
    try {
      await dbUpdate(dbRef(db, `users/${uid}/settings/customization`), {
        profileTag: selectedTag,
        profileBanner: selectedBanner,
        theme: selectedTheme
      });
      // Apply theme immediately
      document.body.className = `theme-${selectedTheme}`;
      setTempStatus("Customization saved!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save customization");
    }
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error(err);
      setErrorMsg("Sign out failed");
    }
  };

  // small helper to programmatically open file picker
  const openFilePicker = () =>
    fileInputRef.current && fileInputRef.current.click();

  return (
    <div className="profile-root">
      <div className="profile-grid">
        {/* Left column: main profile card */}
        <motion.div
          className="profile-card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Full Width Banner */}
          <div 
            className="profile-banner"
            style={{ 
              background: presetBanners.find(b => b.id === selectedBanner)?.gradient || presetBanners[0].gradient,
              height: '180px',
              width: '100%',
              borderRadius: '16px 16px 0 0',
              position: 'relative',
              zIndex: 0
            }}
          />

          <div className="profile-main" style={{ marginTop: '-60px', padding: '0 2rem 2rem', position: 'relative', zIndex: 2 }}>
            <div className="avatar-wrap" style={{ marginBottom: '1rem' }}>
              <img
                alt="avatar"
                src={photoURL || "/avatar-placeholder.png"}
                className="profile-photo"
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  border: '4px solid var(--bg-secondary)',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: 'var(--bg-secondary)'
                }}
              />
              <div className="avatar-actions" style={{ marginTop: '1rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleAvatarPick(e.target.files?.[0])}
                />
                <button className="btn secondary" onClick={openFilePicker}>
                  Upload
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setPhotoURL("");
                    setTempStatus("Avatar cleared");
                  }}
                >
                  Clear
                </button>
                {uploadProgress > 0 ? (
                  <div className="upload-progress">
                    Uploading {uploadProgress}%
                  </div>
                ) : null}
              </div>
            </div>

            <div className="profile-fields" style={{ paddingTop: '70px' }}>
              <label className="field-label">Display name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  className="field-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                {selectedTag && (
                  <span className="profile-tag-badge" style={{ 
                    padding: '0.4rem 0.8rem', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {selectedTag}
                  </span>
                )}
              </div>

              <label className="field-label">Email</label>
              <input
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
              <label className="field-label">Connected providers</label>
              <div className="providers">
                {user?.providerData?.map((p) => (
                  <div key={p.providerId} className="provider-chip">
                    {p.providerId.replace(".com", "")}
                  </div>
                )) || <div className="provider-chip">email</div>}
              </div>

              <div className="profile-actions" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                <button
                  className="btn primary"
                  onClick={saveProfile}
                  disabled={loading}
                >
                  Save profile
                </button>
                <button
                  className="btn outline"
                  onClick={() => {
                    setDisplayName(user?.displayName || "");
                    setPhotoURL(user?.photoURL || "");
                    setTempStatus("Reverted");
                  }}
                >
                  Revert
                </button>
              </div>

              <div className="completion">
                <div className="completion-bar">
                  <div
                    className="completion-fill"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <div className="completion-label">{completeness}% complete</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Customize Panel (Moved to Left Column) */}
        <motion.div
            className="panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            style={{ marginTop: '1.5rem' }}
          >
            <div className="section-title">// customize</div>
            <div className="panel-body">

              {/* Profile Banner Selection */}
              <div className="customize-section">
                <h3>Profile Banner</h3>
                <div className="banner-grid">
                  {presetBanners.map(banner => (
                    <motion.div
                      layout
                      key={banner.id}
                      className={`banner-option ${selectedBanner === banner.id ? "selected" : ""}`}
                      style={{ background: banner.gradient }}
                      onClick={() => setSelectedBanner(banner.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {banner.name}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Profile Tag Selection */}
              <div className="customize-section">
                <h3>Profile Tag</h3>
                {ownedTags.length > 0 ? (
                  <div className="tags-grid">
                    <div
                      className={`tag-option ${selectedTag === "" ? "selected" : ""}`}
                      onClick={() => setSelectedTag("")}
                    >
                      None
                    </div>
                    {ownedTags.map(tag => (
                      <motion.div
                        layout
                        key={tag}
                        className={`tag-option ${selectedTag === tag ? "selected" : ""}`}
                        onClick={() => setSelectedTag(tag)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {tag}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">
                    No tags owned. Visit the <a href="/shop">Shop</a> to purchase tags!
                  </p>
                )}
              </div>

              {/* Theme Selection */}
              <div className="customize-section">
                <h3>App Theme</h3>
                <div className="banner-grid">
                  {[
                    { id: "default", name: "Default", color: "#0c1214" },
                    // Basic
                    { id: "midnight", name: "Midnight", color: "#6c5ce7" },
                    { id: "forest", name: "Forest", color: "#00b894" },
                    { id: "ocean", name: "Ocean", color: "#0984e3" },
                    // Premium
                    { id: "obsidian", name: "Obsidian", color: "#000000" },
                    { id: "nebula", name: "Nebula", color: "#0b0014" },
                    { id: "glass", name: "Glass", color: "#1a1a2e" },
                    { id: "sunset", name: "Sunset", color: "#14100c" },
                  ].filter(t => ownedThemes.includes(t.id)).map(theme => (
                    <motion.div
                      layout
                      key={theme.id}
                      className={`banner-option ${selectedTheme === theme.id ? "selected" : ""}`}
                      style={{ background: theme.color, border: selectedTheme === theme.id ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => setSelectedTheme(theme.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {theme.name}
                    </motion.div>
                  ))}
                </div>
                {ownedThemes.length === 1 && (
                  <p className="muted-text" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    Visit the <a href="/shop" style={{ color: 'var(--color-primary)' }}>Shop</a> to unlock premium themes!
                  </p>
                )}
              </div>

              <button className="btn primary" onClick={saveCustomization}>
                Save Customization
              </button>
            </div>
          </motion.div>

        {/* Right column: verification, security, account */}
        <div className="side-column">
          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 }}
          >
            <div className="section-title">// verification</div>
            <div className="panel-body">
              <div className="verify-row">
                <div>
                  <div className="verify-status">
                    {emailVerified ? "Verified" : "Unverified"}
                  </div>
                  <div className="verify-desc">
                    Your email is {emailVerified ? "verified" : "not verified"}.
                    Verified emails help secure your account.
                  </div>
                </div>
                <div className="verify-actions">
                  <button
                    className={`btn ${emailVerified ? "ghost" : "primary"}`}
                    onClick={handleSendVerification}
                    disabled={emailVerified || loading}
                  >
                    {emailVerified ? "Verified" : "Send verification"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
          >
            <div className="section-title">// security</div>
            <div className="panel-body">
              <div className="security-row">
                <label className="field-label">Current password</label>
                <input
                  className="field-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to re-auth"
                />
                <label className="field-label">New password</label>
                <input
                  className="field-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
                <div className="security-actions">
                  <button
                    className="btn primary"
                    onClick={handleChangePassword}
                    disabled={loading}
                  >
                    Change password
                  </button>
                  <button
                    className="btn outline"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                    }}
                  >
                    Clear
                  </button>
                </div>
                {reauthRequired && (
                  <div className="note">
                    Re-authentication required — enter your current password
                    above.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Settings Panel */}
          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.09 }}
          >
            <div className="section-title">// settings</div>
            <div className="panel-body">
              {/* Notification Toggle */}
              <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <div className="setting-label" style={{ fontWeight: 600 }}>Notifications</div>
                  <div className="setting-desc" style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    Receive alerts for upcoming timetable events.
                  </div>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled}
                    onChange={toggleNotifications}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: notificationsEnabled ? 'var(--color-primary)' : '#ccc',
                    transition: '.4s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '16px', width: '16px',
                      left: '4px', bottom: '4px', backgroundColor: 'white',
                      transition: '.4s', borderRadius: '50%',
                      transform: notificationsEnabled ? 'translateX(16px)' : 'translateX(0)'
                    }}/>
                  </span>
                </label>
              </div>

              {/* Anonymous Mode Toggle */}
              <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="setting-label" style={{ fontWeight: 600 }}>Anonymous Mode</div>
                  <div className="setting-desc" style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    Hide your name and avatar on the leaderboard.
                  </div>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={anonymousMode}
                    onChange={toggleAnonymousMode}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: anonymousMode ? 'var(--color-primary)' : '#ccc',
                    transition: '.4s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '16px', width: '16px',
                      left: '4px', bottom: '4px', backgroundColor: 'white',
                      transition: '.4s', borderRadius: '50%',
                      transform: anonymousMode ? 'translateX(16px)' : 'translateX(0)'
                    }}/>
                  </span>
                </label>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="panel danger"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.12 }}
          >
            <div className="section-title">// account</div>
            <div className="panel-body">
              <div className="account-actions">
                <button className="btn outline" onClick={handleSignOut}>
                  Sign out
                </button>
                <button className="btn danger" onClick={handleDeleteAccount}>
                  Delete account
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* notifications */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            className="toast success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && <div className="toast error">{errorMsg}</div>}
    </div>
  );
}
