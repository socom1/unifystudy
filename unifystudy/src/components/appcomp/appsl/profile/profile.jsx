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
import { ref as dbRef, update as dbUpdate } from "firebase/database";
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
          <div className="card-header">
            <div className="section-title">// profile</div>
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

          <div className="profile-main">
            <div className="avatar-wrap">
              <img
                alt="avatar"
                src={photoURL || "/avatar-placeholder.png"}
                className="profile-photo"
              />
              <div className="avatar-actions">
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

            <div className="profile-fields">
              <label className="field-label">Display name</label>
              <input
                className="field-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
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

              <div className="profile-actions">
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
            </div>
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

          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.1 }}
          >
            <div className="section-title">// sessions</div>
            <div className="panel-body">
              <div className="session-info">
                Active session info is not implemented. You can extend this area
                to list user's active devices and sign-out remote sessions.
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn ghost"
                  onClick={() =>
                    setTempStatus("Session list refresh is a TODO")
                  }
                >
                  Refresh
                </button>
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
