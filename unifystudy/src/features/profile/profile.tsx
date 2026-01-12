// @ts-nocheck
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
import { auth, db, storage } from "@/services/firebaseConfig";
import {
  updateProfile as fbUpdateProfile,
  sendEmailVerification,
  signOut as fbSignOut,

} from "firebase/auth";
import { ref as dbRef, update as dbUpdate, onValue } from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import "./profile.scss"; // companion SCSS (below)
import { THEMES } from "@/constants/themes";
import { ShoppingBag, Calendar as CalendarIcon, Loader2, Crown, Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import PricingModal from "../settings/PricingModal";

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
  const [emailVerified, setEmailVerified] = useState(user?.emailVerified || false);
  const [showPricing, setShowPricing] = useState(false);

  // Customization state
  const [ownedTags, setOwnedTags] = useState<string[]>([]);
  const [ownedThemes, setOwnedThemes] = useState<string[]>(["default"]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBanner, setSelectedBanner] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [avatarColor, setAvatarColor] = useState("#1f6feb");

  const presetBanners = [
    {
      id: "gradient-1",
      name: "Ocean",
      gradient: "#667eea",
    },
    {
      id: "gradient-2",
      name: "Sunset",
      gradient: "#f5576c",
    },
    {
      id: "gradient-3",
      name: "Forest",
      gradient: "#00b894",
    },
    {
      id: "gradient-4",
      name: "Aurora",
      gradient: "#6c5ce7",
    },
  ];



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
      setSelectedTags(data?.profileTags || []);
      setSelectedBanner(data?.profileBanner || "gradient-1");
      setSelectedTheme(data?.theme || "default");
      setAvatarColor(data?.avatarColor || "#1f6feb");
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
      // @ts-ignore
      if (displayName !== user?.displayName) updateObj.displayName = displayName;
      // @ts-ignore
      if (photoURL && photoURL !== user?.photoURL) updateObj.photoURL = photoURL;

      if (Object.keys(updateObj).length > 0) {
        // @ts-ignore
        await fbUpdateProfile(auth.currentUser, updateObj);
      }
      // Optionally mirror to Realtime DB 
      if (uid) {
        await dbUpdate(dbRef(db, `users/${uid}`), {
          displayName: displayName || null,
          photoURL: photoURL || null,
        });

        // Replicate to Public Leaderboard
        await dbUpdate(dbRef(db, `public_leaderboard/${uid}`), {
          displayName: displayName || null,
          photoURL: photoURL || null,
        });
      }
      setTempStatus("Profile saved");
    } catch (err: any) {
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
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to send verification");
    } finally {
      setLoading(false);
    }
  };

  // Avatar upload handler

  const handleAvatarPick = async (file: any) => {
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
            // @ts-ignore
            await fbUpdateProfile(auth.currentUser, { photoURL: url });
            // mirror to DB
            if (uid) {
              await dbUpdate(dbRef(db, `users/${uid}`), { photoURL: url });
              await dbUpdate(dbRef(db, `public_leaderboard/${uid}`), { photoURL: url });
            }
            setUploadProgress(0);
            setTempStatus("Avatar uploaded");
            setLoading(false);
          }
        );
      } else {
        // If no storage configured, use local preview and require manual hosting
        const reader = new FileReader();
        reader.onload = () => {
          setPhotoURL(reader.result as string);
          setTempStatus("Avatar set (local preview)");
          setLoading(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Avatar upload error");
      setLoading(false);
    }
  };

  const saveCustomization = async () => {
    if (!uid) return;
    try {
      await dbUpdate(dbRef(db, `users/${uid}/settings/customization`), {
        profileTags: selectedTags,
        profileBanner: selectedBanner,
        theme: selectedTheme,
        avatarColor: avatarColor,
      });

      // Replicate to Public Leaderboard
      await dbUpdate(dbRef(db, `public_leaderboard/${uid}/settings/customization`), {
        profileTags: selectedTags,
        profileBanner: selectedBanner,
        theme: selectedTheme,
        avatarColor: avatarColor,
      });
      // Theme is applied by ThemeToggle component or AppLayout
      setTempStatus("Customization saved!");
    } catch (err) {
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
  // @ts-ignore
  const openFilePicker = () => fileInputRef.current && fileInputRef.current.click();

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
              background:
                presetBanners.find((b) => b.id === selectedBanner)?.gradient ||
                presetBanners[0].gradient,
              height: "180px",
              width: "100%",
              borderRadius: "16px 16px 0 0",
              position: "relative",
              zIndex: 0,
            }}
          />

          <div
            className="profile-main"
            style={{
              marginTop: "-60px",
              padding: "0 2rem 2rem",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div className="avatar-wrap" style={{ marginBottom: "1rem" }}>
              {photoURL ? (
                <img
                  alt="avatar"
                  src={photoURL}
                  className="profile-photo"
                  style={{
                    width: "120px",
                    height: "120px",
                    border: "4px solid var(--bg-secondary)",
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "var(--bg-secondary)",
                  }}
                />
              ) : (
                <div
                  className="profile-photo"
                  style={{
                    width: "120px",
                    height: "120px",
                    border: "4px solid var(--bg-secondary)",
                    borderRadius: "50%",
                    background: avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  {displayName ? displayName[0].toUpperCase() : "U"}
                </div>
              )}
              <div className="avatar-actions" style={{ marginTop: "1rem" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  name="avatarUpload"
                  id="avatarUpload"
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

            <div className="profile-fields">
              <label className="field-label">Display name</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <input
                  className="field-input"
                  name="displayName"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                {selectedTags.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-1rem",
                      left: "-1rem",
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      zIndex: 3,
                    }}
                  >
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.85rem",
                          color: "white",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="field-label">Email</label>
              <input
                className="field-input"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
              {!emailVerified && (
                <div style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  <small style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Shield size={12} /> Email not verified
                  </small>
                  <button
                    onClick={handleSendVerification}
                    className="btn-text"
                    style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '0.25rem', padding: 0 }}
                    disabled={loading}
                  >
                    Send verification link
                  </button>
                </div>
              )}


              <div
                className="profile-actions"
                style={{ marginTop: "1rem", marginBottom: "1.5rem" }}
              >
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
        </motion.div >

        {/* Customize Panel (Moved to Left Column) */}
        <div
          className="panel"
          style={{ marginTop: "1.5rem" }}
        >
          <div className="section-title">// customize</div>
          <div className="panel-body">
            {/* Profile Banner Selection */}
            <div className="customize-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Profile Banner</h3>
                <a href="/shop" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShoppingBag size={14} /> Store
                </a>
              </div>
              <div className="banner-grid">
                {presetBanners.map((banner) => (
                  <motion.div
                    layout
                    key={banner.id}
                    className={`banner-option ${selectedBanner === banner.id ? "selected" : ""
                      }`}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Profile Tags (Max 3)</h3>
                <a href="/shop" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShoppingBag size={14} /> Store
                </a>
              </div>
              {ownedTags.length > 0 ? (
                <div className="tags-grid">
                  {ownedTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    const canSelect = selectedTags.length < 3 || isSelected;

                    return (
                      <motion.div
                        layout
                        key={tag}
                        className={`tag-option checkbox-style ${isSelected ? "selected" : ""
                          } ${!canSelect ? "disabled" : ""}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(
                              selectedTags.filter((t) => t !== tag)
                            );
                          } else if (canSelect) {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        whileHover={{ scale: canSelect ? 1.05 : 1 }}
                        whileTap={{ scale: canSelect ? 0.95 : 1 }}
                      >
                        {/* Checkbox hidden via CSS, styling handled by parent class */}
                        {tag}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted-text">
                  No tags owned. Visit the <a href="/shop">Shop</a> to purchase
                  tags!
                </p>
              )}
            </div>

            {/* Theme Selection */}
            <div className="customize-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>App Theme</h3>
                <a href="/shop" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShoppingBag size={14} /> Store
                </a>
              </div>

              <div className="banner-grid">
                {THEMES.filter(t => ownedThemes.includes(t.id)).map((theme) => (
                  <motion.div
                    layout
                    key={theme.id}
                    className={`banner-option ${selectedTheme === theme.id ? "selected" : ""
                      }`}
                    style={{ 
                        background: theme.color, 
                        color: (theme.id === 'light' || theme.id === 'cute') ? '#000' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        padding: '4px'
                    }}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      document.documentElement.setAttribute('data-theme', theme.id);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {theme.name}
                  </motion.div>
                ))}

                {THEMES.filter(t => !ownedThemes.includes(t.id)).slice(0, 2).map((theme) => (
                  <motion.div
                    key={theme.id}
                    className="banner-option locked"
                    style={{ 
                        background: '#222', 
                        opacity: 0.6, 
                        cursor: 'not-allowed', 
                        border: '1px dashed #555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        padding: '4px'
                    }}
                  >
                    {theme.name}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Default Avatar Customization */}
            <div className="customize-section">
              <h3>Default Avatar Style</h3>
              <div
                className="banner-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {[
                  "#1f6feb",
                  "#238636",
                  "#8957e5",
                  "#da3633",
                  "#d29922",
                  "#f0883e",
                  "#db6d28",
                  "#bd561d",
                  "#9e4213",
                  "#7d320f",
                ].map((color) => (
                  <motion.div
                    key={color}
                    className={`banner-option ${avatarColor === color ? "selected" : ""
                      }`}
                    style={{
                      background: color,
                      height: "40px",
                      borderRadius: "50%",
                      border:
                        avatarColor === color ? "2px solid white" : "none",
                    }}
                    onClick={() => setAvatarColor(color)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </div>

            <button className="btn primary" onClick={saveCustomization}>
              Save Customization
            </button>
          </div>
        </div >

        {/* Subscription Card */}
        <div
          className="profile-card"
          style={{
            border: '1px solid rgba(255, 215, 0, 0.3)',
            background: 'linear-gradient(145deg, var(--bg-secondary), rgba(255, 215, 0, 0.05))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Gold top border line */}
          < div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent)'
          }} />

          < div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', color: '#ffd700' }}>
              <Crown size={20} fill="#ffd700" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--color-text)' }}>Subscription</h2>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Current Plan</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Free Student</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                Active
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
              Upgrade to unlock unlimited tasks, cloud sync, and premium themes.
            </p>

            <button
              onClick={() => React.startTransition(() => setShowPricing(true))}
              style={{
                width: '100%',
                padding: '0.8rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Upgrade to Pro <Zap size={16} fill="currentColor" />
            </button>
          </div >
        </div >

        {/* Right column: settings/customization, security, account */}
        < div className="side-column" >
          <div
            className="panel"
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
          </div>


          {/* Settings Shortcut */}
          <div
            className="panel"
          >
            <div className="section-title">// account settings</div>
            <div className="panel-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
                Manage your password, linked accounts, and other preferences in Settings.
              </p>
              <a href="/settings" className="btn outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Go to Settings
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* notifications */}
      <AnimatePresence>
        {
          statusMsg && (
            <motion.div
              className="toast success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {statusMsg}
            </motion.div>
          )
        }
      </AnimatePresence >

      {errorMsg && <div className="toast error">{errorMsg}</div>
      }
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div >
  );
}
