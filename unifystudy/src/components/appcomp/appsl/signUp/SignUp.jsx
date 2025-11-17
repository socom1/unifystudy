import { useState } from "react";
<<<<<<< Updated upstream
import { auth } from "../firebase"; // 👈 Import from your central firebase.js
import {
=======
import {
  getAuth,
>>>>>>> Stashed changes
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
<<<<<<< Updated upstream
import { motion, AnimatePresence } from "framer-motion";
import "./signup.scss";

=======
import { initializeApp } from "firebase/app";
import { motion, AnimatePresence } from "framer-motion";
import "./signup.scss";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCax0FPsBTauiQjJc8alni_mnKQjMxvn1A",
  authDomain: "unifys-c6b42.firebaseapp.com",
  projectId: "unifys-c6b42",
  storageBucket: "unifys-c6b42.firebasestorage.app",
  messagingSenderId: "397741027892",
  appId: "1:397741027892:web:e01f7db83b838ce3915061",
  measurementId: "G-XJQRKVSPKR",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

>>>>>>> Stashed changes
export default function SignUp({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
<<<<<<< Updated upstream

  const googleProvider = new GoogleAuthProvider();
=======
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;
>>>>>>> Stashed changes

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

<<<<<<< Updated upstream
    if (!email || password.length < 6) {
      setError("Invalid email or password must be 6+ characters.");
=======
    if (!validateEmail(email)) {
      setError("Invalid email format.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 6 characters.");
>>>>>>> Stashed changes
      return;
    }

    try {
      const userCredential = isLogin
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);

      const user = userCredential.user;
      setSuccess(isLogin ? "Logged in successfully!" : "Account created!");
      if (onLoginSuccess) onLoginSuccess(user);
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
      setSuccess(`Signed in as ${user.displayName || user.email}`);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <h2 className="signup-title">{isLogin ? "Log In" : "Sign Up"}</h2>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
<<<<<<< Updated upstream
                placeholder="Email"
=======
                placeholder="Enter your email"
>>>>>>> Stashed changes
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
<<<<<<< Updated upstream
              <label className="pass">Password</label>
              <input
                type="password"
                placeholder="Password"
=======
            </div>

            <div className="form-group password-group">
              <label>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
>>>>>>> Stashed changes
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
<<<<<<< Updated upstream
              <button type="submit" className="btn-primary">
                {isLogin ? "Log In" : "Sign Up"}
              </button>
            </div>
=======
              {/* <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </span> */}
            </div>

            <button type="submit" className="btn-primary">
              {isLogin ? "Log In" : "Sign Up"}
            </button>
>>>>>>> Stashed changes
          </form>

          <div className="divider"></div>
          <h1>OR</h1>
<<<<<<< Updated upstream
          <button className="btn-google" onClick={handleGoogleSignIn}>
            {isLogin ? "Log in with Google" : "Sign up with Google"}
=======

          <button className="btn-google" onClick={handleGoogleSignIn}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google logo"
              className="google-logo"
            />
            <span>
              {isLogin ? "Log in with Google" : "Sign up with Google"}
            </span>
>>>>>>> Stashed changes
          </button>

          <p className="toggle-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </p>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

{
  /* <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </span> */
}
