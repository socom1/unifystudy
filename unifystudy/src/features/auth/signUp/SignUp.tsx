// @ts-nocheck
// SignUp.jsx
import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { auth, googleProvider } from "@/services/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GoogleUsernameModal from "./modal/passwordM/GoogleUsernameModal";
import EmailVerificationModal from "./modal/verfM/EmailVerificationModal";
import SignUpForm from "./SignUpForm";
import "./signup.css";

export default function SignUp({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showGoogleUsernameModal, setShowGoogleUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  const [showEmailVerificationModal, setShowEmailVerificationModal] =
    useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [isBlockingUI, setIsBlockingUI] = useState(false);

  // HANDLER FOR REACT-HOOK-FORM
  const handleSubmit = async (data) => {
    // e.preventDefault(); // handled by hook form
    setError("");
    setSuccess("");
    setIsBlockingUI(true);

    const { email, password, username } = data;

    try {
      if (isLogin) {
        // LOGIN
        await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        if (!user.emailVerified) {
          setIsBlockingUI(false);
          return setError("Please verify your email before logging in.");
        }

        setSuccess("Logged in successfully!");
        if (onLoginSuccess) onLoginSuccess(user);
        navigate("/profile");
      } else {
        // SIGN UP
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        await sendEmailVerification(user, {
          url: window.location.origin + "/login",
          handleCodeInApp: true,
        });

        setUserEmail(email);
        setIsBlockingUI(false);
        setShowEmailVerificationModal(true);
      }
    } catch (err) {
      setIsBlockingUI(false);
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    try {
      await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const googleFullName = user.displayName || "";
      const isGoogle = user.providerData.some(
        (p) => p.providerId === "google.com"
      );

      // If no username set yet → open modal
      if (!user.displayName) {
        setGoogleUser(user);
        setShowGoogleUsernameModal(true);
        setIsBlockingUI(true);
      } else {
        if (onLoginSuccess) onLoginSuccess(user);
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetGoogleUsername = async () => {
    if (!googleUsername.trim()) return setError("Username cannot be empty.");

    try {
      await updateProfile(googleUser, { displayName: googleUsername });

      setShowGoogleUsernameModal(false);
      setGoogleUser(null);
      setGoogleUsername("");
      setIsBlockingUI(false);

      if (onLoginSuccess) onLoginSuccess(auth.currentUser);

      navigate("/profile");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelGoogleUsername = async () => {
    await signOut(auth);
    setShowGoogleUsernameModal(false);
    setGoogleUser(null);
    setGoogleUsername("");
    setError("");
    setIsBlockingUI(false);
  };

  // FIXED AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsBlockingUI(false);
        return;
      }

      const isGoogle = user.providerData.some(
        (p) => p.providerId === "google.com"
      );

      if (isGoogle) {
        // If Google login but no username assigned yet
        if (!user.displayName) {
          setGoogleUser(user);
          setShowGoogleUsernameModal(true);
          setIsBlockingUI(true);
        } else {
             // User has display name, no action needed here
        }
      }

      // Do NOT block UI for normal email users
      setIsBlockingUI(false);
    });

    return unsubscribe;
  }, []);

  const toggleLoginMode = () => setIsLogin(!isLogin);

  return (
    <div className="signup-container">
      <AnimatePresence mode="wait">
        {!isBlockingUI && (
          <motion.div
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <h2 className="signup-title">{isLogin ? "Log In" : "Sign Up"}</h2>

            <SignUpForm
              isLogin={isLogin}
              onSubmit={handleSubmit}
              handleGoogleSignIn={handleGoogleSignIn}
              toggleLoginMode={toggleLoginMode}
              serverError={error}
              isLoading={isBlockingUI} // Reusing blocking state for loading indicator
              keepLoggedIn={keepLoggedIn}
              setKeepLoggedIn={setKeepLoggedIn}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showGoogleUsernameModal && (
        <GoogleUsernameModal
          googleUsername={googleUsername}
          setGoogleUsername={setGoogleUsername}
          handleSetGoogleUsername={handleSetGoogleUsername}
          handleCancel={handleCancelGoogleUsername}
          error={error}
          isOpen={showGoogleUsernameModal}
        />
      )}

      {showEmailVerificationModal && (
        <EmailVerificationModal
          isOpen={showEmailVerificationModal}
          onClose={() => setShowEmailVerificationModal(false)}
          email={userEmail}
        />
      )}
    </div>
  );
}
