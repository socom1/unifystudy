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
import { useNavigate, useLocation } from "react-router-dom";
import GoogleUsernameModal from "./modal/passwordM/GoogleUsernameModal";
import EmailVerificationModal from "./modal/verfM/EmailVerificationModal";
import SignUpForm from "./SignUpForm";
import "./signup.scss";
import { getVersion } from "@/data/releaseNotes";
// Helper to map Firebase errors to user-friendly messages
const getFriendlyErrorMessage = (error) => {
  const code = error.code;
  if (!code) return error.message || "An unexpected error occurred.";

  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address format.";
    case "auth/user-not-found":
    case "auth/invalid-credential": // Newer Firebase versions use this
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      // Return cleaned up message if code not found
      return error.message.replace("Firebase: ", "").replace(` (${code})`, "");
  }
};

export default function SignUp({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.pathname === "/login");
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
      setError(getFriendlyErrorMessage(err));
    }
  };

  // Listen for Deep Link Token (Electron)
  useEffect(() => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      
      const handleAuthSuccess = async (event, token) => {
        try {
            console.log("Received token from deep link");
            const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
            const credential = GoogleAuthProvider.credential(token);
            
            await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
            const result = await signInWithCredential(auth, credential);
            
            // Proceed with user logic
            const user = result.user;
            if (!user.displayName) {
                setGoogleUser(user);
                setShowGoogleUsernameModal(true);
                setIsBlockingUI(true);
            } else {
                if (onLoginSuccess) onLoginSuccess(user);
                navigate("/profile");
            }
        } catch (err) {
            console.error(err);
            setError(getFriendlyErrorMessage(err));
        }
      };

      ipcRenderer.on('google-auth-success', handleAuthSuccess);
      
      return () => {
        ipcRenderer.removeListener('google-auth-success', handleAuthSuccess);
      };
    }
  }, [keepLoggedIn, onLoginSuccess, navigate]);

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    // ELECTRON CHECK
    if (window.require) {
        const { shell } = window.require('electron');
        // Open the Auth Bridge in default browser
        // TODO: In production, change this to your hosted URL
        shell.openExternal("http://localhost:5173/desktop-auth");
        return;
    }

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
      setError(getFriendlyErrorMessage(err));
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
      setError(getFriendlyErrorMessage(err));
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
    <div className="terminal-auth-wrapper">
      <div className="terminal-window">
        {/* Terminal Header / Controls */}
        <div className="terminal-header">
            <div className="window-controls">
                <span className="control red"></span>
                <span className="control yellow"></span>
                <span className="control green"></span>
            </div>
            <div className="terminal-title">user_auth.exe — -bash — 80x24</div>
        </div>

        {/* Terminal Content */}
        <div className="terminal-body">
            <AnimatePresence mode="wait">
            {!isBlockingUI && (
                <motion.div
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="terminal-content-grid"
                >
                <div className="terminal-branding">
                    <pre className="ascii-logo">
{` __  __     ______     __     __
/\\ \\/\\ \\   /\\  ___\\   /\\ \\   /\\ \\
\\ \\ \\_\\ \\  \\ \\___  \\  \\ \\ \\  \\ \\ \\
 \\ \\_____\\  \\/\\_____\\  \\ \\_\\  \\ \\_\\
  \\/_____/   \\/_____/   \\/_/   \\/_/ `}
                    </pre>
                    <div className="system-status">
                        <p>&gt; SYSTEM_STATUS: <span className="status-ok">ONLINE</span></p>
                        <p>&gt; VERSION: <span className="status-ver">v{getVersion()}</span></p>
                        <p>&gt; ENCRYPTION: <span className="status-enc">ENABLED</span></p>
                    </div>
                </div>

                <div className="terminal-form-section">
                    <div className="command-prompt">
                        <span className="prompt-user">guest@unifystudy</span>
                        <span className="prompt-symbol">:~$</span>
                        <span className="prompt-command">{isLogin ? "./login.sh" : "./create_user.sh"}</span>
                    </div>

                    <SignUpForm
                        isLogin={isLogin}
                        onSubmit={handleSubmit}
                        handleGoogleSignIn={handleGoogleSignIn}
                        toggleLoginMode={toggleLoginMode}
                        serverError={error}
                        isLoading={isBlockingUI} 
                        keepLoggedIn={keepLoggedIn}
                        setKeepLoggedIn={setKeepLoggedIn}
                    />
                </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

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
