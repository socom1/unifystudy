import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
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
  const [name, setName] = useState(""); // Full name
  const [username, setUsername] = useState(""); // Short username / handle
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showGoogleUsernameModal, setShowGoogleUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");
  const [showEmailVerificationModal, setShowEmailVerificationModal] =
    useState(false);
  const [isBlockingUI, setIsBlockingUI] = useState(false);

  // Validation
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;

  // Email/password submit
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
        // SIGNUP
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

        // Show email verification modal
        setShowEmailVerificationModal(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Google sign-in
  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const isGoogle = user.providerData.some(
        (p) => p.providerId === "google.com"
      );
      const googleFullName = user.displayName || "";
      if (isGoogle) setName(googleFullName);

      // If username missing or same as full name, show modal
      if (!user.displayName || user.displayName === googleFullName) {
        setGoogleUser(user);
        setShowGoogleUsernameModal(true);
        setGoogleUsername("");
        setIsBlockingUI(true);
      } else {
        setUsername(user.displayName);
        setIsBlockingUI(false);
        setSuccess(`Signed in as ${user.displayName}`);
        if (onLoginSuccess) onLoginSuccess(user);
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Set Google username
  const handleSetGoogleUsername = async () => {
    if (!googleUsername.trim()) return setError("Username cannot be empty.");
    try {
      // Update Firebase user
      await updateProfile(googleUser, { displayName: googleUsername });

      setShowGoogleUsernameModal(false);
      setUsername(googleUsername);

      // Pass the real Firebase user, not a spread object
      if (onLoginSuccess) onLoginSuccess(googleUser);

      setGoogleUser(null);
      setGoogleUsername("");
      setIsBlockingUI(false);
      setError("");
      setSuccess(`Signed in as ${googleUsername}`);
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

  // Listen to auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const isGoogle = user.providerData.some(
          (p) => p.providerId === "google.com"
        );
        const googleFullName = user.displayName || "";

        if (isGoogle) {
          setName(googleFullName);

          if (!user.displayName || user.displayName === googleFullName) {
            setGoogleUser(user);
            setShowGoogleUsernameModal(true);
            setIsBlockingUI(true);
          } else {
            setUsername(user.displayName);
            setIsBlockingUI(false);
          }
        } else {
          setIsBlockingUI(false);
        }
      } else {
        setIsBlockingUI(false);
      }
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
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google username modal */}
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

      {/* Email verification modal */}
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
