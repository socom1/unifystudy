import React, { useState } from "react";
import {
  getAuth,
  deleteUser,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import "./Profile.css";

const Profile = ({ user, onSignOut }) => {
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);

  const auth = getAuth();

  if (!user) return <p>Please sign in to view your profile.</p>;

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user);
      setMessage("Account deleted successfully.");
      if (onSignOut) onSignOut();
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage(
        "Error deleting account. You may need to re-login and try again."
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMessage("Signed out successfully.");
      if (onSignOut) onSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage("Error signing out. Please try again.");
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      setMessage("Error sending reset email. Try again later.");
    }
  };

  // Change password
  const handleChangePassword = async () => {
    try {
      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setShowChangePassword(false);
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage(
        "Error changing password. Make sure your current password is correct."
      );
    }
  };

  return (
    <div className="profile-container">
      <h2>Profile</h2>
      <div className="profile-card">
        <p>
          <strong>Name:</strong> {user.displayName || "No display name"}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        {user.photoURL && (
          <img src={user.photoURL} alt="Profile" className="profile-photo" />
        )}

        <div className="profile-buttons">
          <button className="sign-out-btn" onClick={handleSignOut}>
            Sign Out
          </button>
          <button className="delete-account-btn" onClick={handleDeleteAccount}>
            Delete Account
          </button>
          <button
            className="forgot-password-btn"
            onClick={handleForgotPassword}
          >
            Forgot Your Password?
          </button>
          <button
            className="change-password-toggle-btn"
            onClick={() => setShowChangePassword(!showChangePassword)}
          >
            {showChangePassword ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showChangePassword && (
          <div className="change-password-form">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={handleChangePassword}>Update Password</button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default Profile;
