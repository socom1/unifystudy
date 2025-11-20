import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import NavM from "./components/appcomp/nav/NavM";
import NavS from "./components/appcomp/nav/NavS";
import AppS from "./components/appcomp/appsl/AppS";
import "./App.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Handle sign out
  const handleSignOut = () => {
    setUser(null);
  };

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Router>
      <div className="app">
        {/* Mobile Menu */}
        <NavM isActive={isActive} user={user} isMobile={isMobile} />

        <div className="container">
          {/* Desktop Navbar */}
          <div className="navf">
            <NavS
              onToggle={() => setIsActive(!isActive)}
              isMobile={isMobile}
              user={user}
            />
          </div>

          {/* Main App Content with Routes handled inside AppS */}
          <AppS
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </Router>
  );
}

export default App;
