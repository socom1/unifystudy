// @ts-nocheck
import React, { useState } from "react";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./resetPassword.scss";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode"); // Firebase sends this in the URL

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!oobCode) {
      setError("Invalid or missing reset code.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("Password has been reset successfully!");
      setTimeout(() => navigate("/login"), 2000); // Redirect to login
    } catch (err) {
      console.error(err);
      setError("Failed to reset password. The link may have expired.");
    }

    setLoading(false);
  };

  return (
    <div className="reset-password-container">
      <h2>Reset Password</h2>
      <form className="reset-password-form" onSubmit={handleResetPassword}>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {error && <p className="error-msg">{error}</p>}
      {message && <p className="success-msg">{message}</p>}
    </div>
  );
};

export default ResetPassword;
