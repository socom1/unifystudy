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
import { auth, googleProvider } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GoogleUsernameModal from "./modal/passwordM/GoogleUsernameModal";
import EmailVerificationModal from "./modal/verfM/EmailVerificationModal";
import SignUpForm from "./SignUpForm";
import "./signup.css";

export default function SignUp({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showGoogleUsernameModal, setShowGoogleUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  const [showEmailVerificationModal, setShowEmailVerificationModal] =
    useState(false);

  const [isBlockingUI, setIsBlockingUI] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) return setError("Invalid email format.");
    if (!validatePassword(password))
      return setError("Password must be at least 6 characters.");
    if (!isLogin && !username.trim())
      return setError("Please enter a username.");

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

        if (!user.emailVerified)
          return setError("Please verify your email before logging in.");

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
          url: "http://localhost:3000/login",
          handleCodeInApp: true,
        });

        setShowEmailVerificationModal(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const googleFullName = user.displayName || "";
      const isGoogle = user.providerData.some(
        (p) => p.providerId === "google.com"
      );

      if (isGoogle) setName(googleFullName);

      // If no username set yet → open modal
      if (!user.displayName) {
        setGoogleUser(user);
        setShowGoogleUsernameModal(true);
        setIsBlockingUI(true);
      } else {
        setUsername(user.displayName);
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
      setUsername(googleUsername);
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
        const fullName = user.displayName || "";
        setName(fullName);

        // If Google login but no username assigned yet
        if (!user.displayName) {
          setGoogleUser(user);
          setShowGoogleUsernameModal(true);
          setIsBlockingUI(true);
        } else {
          setUsername(user.displayName);
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
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handleSubmit={handleSubmit}
              handleGoogleSignIn={handleGoogleSignIn}
              toggleLoginMode={toggleLoginMode}
              error={error}
              success={success}
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
          email={email}
        />
      )}
    </div>
  );
}
