import React, { useState } from "react";
import { getAuth, deleteUser, signOut } from "firebase/auth";
<<<<<<< Updated upstream
import "./profile.css";
=======
import "./Profile.css";
>>>>>>> Stashed changes

const Profile = ({ user, onSignOut }) => {
  const [message, setMessage] = useState("");
  const auth = getAuth();

  if (!user) return <p>Please sign in to view your profile.</p>;

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user);
      setMessage("Account deleted successfully.");
      if (onSignOut) onSignOut(); // redirect after deletion
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
      if (onSignOut) onSignOut(); // redirect after sign-out
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage("Error signing out. Please try again.");
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
        </div>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default Profile;
