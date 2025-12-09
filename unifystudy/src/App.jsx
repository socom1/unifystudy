import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";

import "./styles/Themes.scss";

import GlobalPlayer from "./components/appcomp/appsl/global/GlobalPlayer";
import UpdateNotification from "./components/appcomp/appsl/update/UpdateNotification";
import { auth } from "./components/appcomp/appsl/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Apply theme if saved
        if (currentUser?.settings?.theme) {
          document.body.className = `theme-${currentUser.settings.theme}`;
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Apply theme if saved
    if (userData?.settings?.theme) {
      document.body.className = `theme-${userData.settings.theme}`;
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Router>
      <AppS
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onSignOut={handleSignOut}
      />
      
      {user && <GlobalPlayer />}
      <UpdateNotification />
    </Router>
  );
}

export default App;
