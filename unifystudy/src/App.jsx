import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import Sidebar from "./components/appcomp/nav/Sidebar"; // <-- NEW Sidebar
import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";

import "./styles/Themes.scss";

import GlobalPlayer from "./components/appcomp/appsl/global/GlobalPlayer";

function App() {
  const [user, setUser] = useState(null);

  // Handle login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Apply theme if saved
    if (userData?.settings?.theme) {
      document.body.className = `theme-${userData.settings.theme}`;
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    setUser(null);
  };

  return (
    <Router>
      <div className="app-layout">
        {/* Sidebar Navigation */}
        <Sidebar user={user} onSignOut={handleSignOut} />

        {/* Main Content Area */}
        <div className="main-content">
          <AppS
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onSignOut={handleSignOut}
          />
        </div>
        
        {user && <GlobalPlayer />}
      </div>
    </Router>
  );
}

export default App;
